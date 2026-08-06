import { execSync, exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CANDIDATE_SERVICES = ['MSSQL$SQLEXPRESS', 'MSSQLSERVER'];

/**
 * Check status of SQL Server Windows service.
 * @returns {{ installed: boolean, running: boolean, serviceName: string | null, status: string }}
 */
export function checkSqlServerStatus() {
  if (process.platform !== 'win32') {
    return { installed: true, running: true, serviceName: 'non-windows', status: 'RUNNING' };
  }

  for (const serviceName of CANDIDATE_SERVICES) {
    try {
      const stdout = execSync(`sc query "${serviceName}"`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
      if (stdout.includes('STATE')) {
        const isRunning = stdout.includes('RUNNING');
        const status = isRunning ? 'RUNNING' : stdout.includes('STOPPED') ? 'STOPPED' : 'OTHER';
        return { installed: true, running: isRunning, serviceName, status };
      }
    } catch (e) {
      // Service not installed, check next candidate
    }
  }

  return { installed: false, running: false, serviceName: null, status: 'NOT_INSTALLED' };
}

/**
 * Ensure SQL Server service is running. If stopped, attempts to start it via net start.
 * @returns {Promise<{ success: boolean, message: string }>}
 */
export async function ensureSqlServerRunning() {
  const status = checkSqlServerStatus();

  if (!status.installed) {
    return {
      success: false,
      message: 'خادم قواعد البيانات SQL Server Express غير مثبت على جهاز الكمبيوتر.'
    };
  }

  if (status.running) {
    return { success: true, message: `خادم SQL Server (${status.serviceName}) يعمل بنجاح.` };
  }

  // Service exists but is stopped -> Attempt starting
  return new Promise((resolve) => {
    console.log(`[PrereqChecker] Attempting to start stopped SQL service: ${status.serviceName}...`);
    exec(`net start "${status.serviceName}"`, { windowsHide: true }, (err) => {
      if (err) {
        console.warn(`[PrereqChecker] Failed to start service ${status.serviceName}:`, err.message);
        // Fallback to PowerShell
        exec(`powershell -Command "Start-Service -Name '${status.serviceName}'"`, { windowsHide: true }, (psErr) => {
          if (psErr) {
            console.error(`[PrereqChecker] PowerShell Start-Service failed:`, psErr.message);
            resolve({
              success: false,
              message: `تعذر تشغيل خدمة SQL Server (${status.serviceName}). يرجى تشغيل البرنامج كمسؤول (Run as Administrator).`
            });
          } else {
            resolve({ success: true, message: `تم تشغيل خدمة SQL Server (${status.serviceName}) بنجاح.` });
          }
        });
      } else {
        resolve({ success: true, message: `تم تشغيل خدمة SQL Server (${status.serviceName}) بنجاح.` });
      }
    });
  });
}

function getScriptPath(scriptName) {
  if (process.resourcesPath) {
    const resPath = path.join(process.resourcesPath, 'scripts', scriptName);
    if (fs.existsSync(resPath)) {
      return resPath;
    }
  }
  return path.join(__dirname, scriptName);
}

/**
 * Execute automated self-healing for SQL Server (starts service, sets auto-start, installs if missing).
 * @param {(msg: string) => void} progressCallback
 * @returns {Promise<{ success: boolean, message: string }>}
 */
export async function autoFixSqlServer(progressCallback = () => {}) {
  const status = checkSqlServerStatus();

  if (!status.installed) {
    progressCallback('جاري تثبيت خادم قواعد البيانات SQL Server Express...');
    const psScriptPath = getScriptPath('install_sqlexpress.ps1');

    if (!fs.existsSync(psScriptPath)) {
      return { success: false, message: 'ملف التثبيت التلقائي لـ SQL Server غير موجود.' };
    }

    return new Promise((resolve) => {
      const cmd = `powershell -ExecutionPolicy Bypass -File "${psScriptPath}"`;
      exec(cmd, { windowsHide: false }, (err) => {
        if (err) {
          resolve({
            success: false,
            message: 'فشل التثبيت التلقائي لـ SQL Server. يرجى تثبيته يدوياً.'
          });
        } else {
          resolve({ success: true, message: 'تم تثبيت SQL Server Express بنجاح.' });
        }
      });
    });
  }

  progressCallback(`جاري إصلاح وتشغيل خدمة SQL Server (${status.serviceName})...`);

  // Configure automatic startup type & start service
  return new Promise((resolve) => {
    const cmd = `sc config "${status.serviceName}" start= auto && net start "${status.serviceName}"`;
    exec(cmd, { windowsHide: true }, async () => {
      const recheck = checkSqlServerStatus();
      if (recheck.running) {
        resolve({ success: true, message: `تم إصلاح وتشغيل خدمة SQL Server (${status.serviceName}) بنجاح.` });
      } else {
        const startResult = await ensureSqlServerRunning();
        resolve(startResult);
      }
    });
  });
}
