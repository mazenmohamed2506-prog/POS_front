import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';
import http from 'http';
import { spawn, execSync } from 'child_process';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function resolvePrereqCheckerPath() {
  if (app.isPackaged) {
    const asarPath = path.join(__dirname, 'scripts', 'prereqChecker.js');
    if (fs.existsSync(asarPath)) {
      return asarPath;
    }
    const resPath = path.join(process.resourcesPath, 'scripts', 'prereqChecker.js');
    if (fs.existsSync(resPath)) {
      return resPath;
    }
  }
  return path.join(__dirname, 'scripts', 'prereqChecker.js');
}

async function loadPrereqChecker() {
  const scriptPath = resolvePrereqCheckerPath();
  const scriptUrl = pathToFileURL(scriptPath).href;
  return await import(scriptUrl);
}

let mainWindow = null;
let splashWindow = null;
let apiProcess = null;

function resolveBackendExecutable() {
  if (app.isPackaged) {
    const apiDir = path.join(process.resourcesPath, 'api');
    const apiExe = path.join(apiDir, 'POS.exe');
    return { executable: apiExe, cwd: apiDir, args: [] };
  }

  // Development environment paths
  const publishExe = path.resolve(__dirname, '../../backend/POS/POS/publish/POS.exe');
  if (fs.existsSync(publishExe)) {
    return { executable: publishExe, cwd: path.dirname(publishExe), args: [] };
  }

  const releaseExe = path.resolve(__dirname, '../../backend/POS/POS/bin/Release/net8.0/win-x64/POS.exe');
  if (fs.existsSync(releaseExe)) {
    return { executable: releaseExe, cwd: path.dirname(releaseExe), args: [] };
  }

  const debugExe = path.resolve(__dirname, '../../backend/POS/POS/bin/Debug/net8.0/POS.exe');
  if (fs.existsSync(debugExe)) {
    return { executable: debugExe, cwd: path.dirname(debugExe), args: [] };
  }

  // Fallback to dotnet run
  const backendProjectDir = path.resolve(__dirname, '../../backend/POS/POS');
  return { executable: 'dotnet', cwd: backendProjectDir, args: ['run', '--project', backendProjectDir] };
}

function startBackend() {
  const { executable, cwd, args } = resolveBackendExecutable();

  console.log(`[Main] Spawning backend: "${executable}" ${args.join(' ')} (cwd: "${cwd}")`);

  try {
    apiProcess = spawn(executable, args, {
      cwd,
      env: {
        ...process.env,
        ASPNETCORE_ENVIRONMENT: 'Production',
        ASPNETCORE_URLS: 'http://localhost:5000'
      },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    if (apiProcess.stdout) {
      apiProcess.stdout.on('data', (data) => {
        console.log(`[API STDOUT]: ${data.toString().trim()}`);
      });
    }

    if (apiProcess.stderr) {
      apiProcess.stderr.on('data', (data) => {
        console.error(`[API STDERR]: ${data.toString().trim()}`);
      });
    }

    apiProcess.on('error', (err) => {
      console.error('[API ERROR] Failed to start backend process:', err);
    });

    apiProcess.on('exit', (code, signal) => {
      console.log(`[API EXIT] Backend process exited with code ${code} and signal ${signal}`);
      apiProcess = null;
    });
  } catch (err) {
    console.error('[Main] Exception starting backend process:', err);
  }
}

function stopBackend() {
  if (apiProcess && !apiProcess.killed) {
    console.log('[Main] Stopping backend process (PID:', apiProcess.pid, ')...');
    try {
      if (process.platform === 'win32') {
        execSync(`taskkill /pid ${apiProcess.pid} /T /F`);
      } else {
        apiProcess.kill('SIGTERM');
      }
    } catch (err) {
      console.error('[Main] Error stopping backend process:', err.message);
      try {
        apiProcess.kill();
      } catch (e) {}
    }
    apiProcess = null;
  }
}

/**
 * Polls backend health endpoint with strict 20-second timeout (40 attempts * 500ms).
 * Verifies both HTTP 200 OK and response JSON body status.
 */
function waitForBackend(url = 'http://localhost:5000/api/health', retries = 40, intervalMs = 500) {
  return new Promise((resolve) => {
    let attempts = 0;
    const check = () => {
      attempts++;
      const req = http.get(url, (res) => {
        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              const json = JSON.parse(body);
              if (json.status === 'ok' && json.database !== false) {
                console.log(`[Main] Backend & DB fully healthy after ${attempts} attempts`);
                resolve({ success: true, message: 'جاهز' });
                return;
              }
            } catch (e) {
              // Plain 200 OK fallback
              resolve({ success: true, message: 'جاهز' });
              return;
            }
          }

          if (attempts >= retries) {
            console.warn(`[Main] Backend returned HTTP ${res.statusCode} (Unhealthy) after ${retries} attempts.`);
            resolve({ success: false, message: 'فشل الاتصال بقاعدة البيانات أو الخادم المحلي.' });
          } else {
            setTimeout(check, intervalMs);
          }
        });
      });

      req.on('error', () => {
        req.destroy();
        if (attempts >= retries) {
          console.warn(`[Main] Backend health check timed out after ${retries} attempts.`);
          resolve({ success: false, message: 'انتهت مهلة الاتصال بالخادم المحلي (20 ثانية).' });
        } else {
          setTimeout(check, intervalMs);
        }
      });
    };
    check();
  });
}

// ──────────────────────────────────────────────────────────────
//  Splash Screen
// ──────────────────────────────────────────────────────────────
function createSplashWindow() {
  const iconPath = app.isPackaged
    ? path.join(__dirname, 'dist', 'icon.png')
    : path.join(__dirname, 'public', 'icon.png');

  splashWindow = new BrowserWindow({
    width: 440,
    height: 400,
    frame: false,
    transparent: false,
    resizable: false,
    movable: true,
    center: true,
    alwaysOnTop: true,
    skipTaskbar: false,
    icon: iconPath,
    show: false,
    backgroundColor: '#0f172a',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // Copy icon to splash directory so it can be loaded from the HTML
  const splashDir = app.isPackaged ? path.join(__dirname, 'dist') : __dirname;
  const splashIconDest = path.join(splashDir, 'icon.png');
  if (!fs.existsSync(splashIconDest)) {
    try {
      fs.copyFileSync(iconPath, splashIconDest);
    } catch (e) {
      // Not critical — splash will just show without icon
    }
  }

  splashWindow.loadFile(app.isPackaged
    ? path.join(__dirname, 'dist', 'splash.html')
    : path.join(__dirname, 'splash.html')
  );

  splashWindow.once('ready-to-show', () => {
    splashWindow.show();
  });

  splashWindow.on('closed', () => {
    splashWindow = null;
  });

  return splashWindow;
}

function sendSplashStatus(state, message) {
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.webContents.send('splash-status', { state, message });
  }
}

function closeSplash() {
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.close();
    splashWindow = null;
  }
}

// ──────────────────────────────────────────────────────────────
//  Main Window
// ──────────────────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    show: false,
    icon: app.isPackaged ? path.join(__dirname, 'dist', 'icon.png') : path.join(__dirname, 'public', 'icon.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      backgroundThrottling: false
    }
  });

  if (app.isPackaged) {
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
    mainWindow.setMenu(null);
  } else {
    mainWindow.loadURL('http://localhost:5173');
  }

  mainWindow.once('ready-to-show', () => {
    closeSplash();
    mainWindow.show();
    mainWindow.focus();
  });
}

// ──────────────────────────────────────────────────────────────
//  Startup Sequence
// ──────────────────────────────────────────────────────────────
async function bootSequence() {
  sendSplashStatus('loading', 'فحص المتطلبات وخدمة قواعد البيانات...');

  // Step 1: Ensure SQL Server service is running
  const { ensureSqlServerRunning } = await loadPrereqChecker();
  const prereqResult = await ensureSqlServerRunning();
  if (!prereqResult.success) {
    console.warn('[Main] Prerequisite check failed:', prereqResult.message);
  }

  sendSplashStatus('loading', 'جاري تشغيل الخادم المحلي...');
  startBackend();

  sendSplashStatus('loading', 'جاري فحص الاتصال بقاعدة البيانات...');
  const healthCheck = await waitForBackend();

  if (healthCheck.success) {
    sendSplashStatus('loading', 'جاري تحميل الواجهة الرئيسية...');
    createWindow();
  } else {
    console.error('[Main] Backend failed to reach ready state. Aborting boot sequence.');
    stopBackend();
    sendSplashStatus('error', healthCheck.message || 'تعذر الاتصال بالخادم المحلي. يرجى التحقق من خدمة SQL Server.');
  }
}

app.whenReady().then(async () => {
  createSplashWindow();
  await bootSequence();

  // Handle retry from splash screen
  ipcMain.on('splash-retry', async () => {
    console.log('[Main] Retry requested from splash screen');
    stopBackend();
    await bootSequence();
  });

  // Handle auto-fix from splash screen
  ipcMain.on('splash-autofix', async () => {
    console.log('[Main] Auto-Fix requested from splash screen');
    sendSplashStatus('loading', 'جاري إشعار نظام التشغيل وإصلاح خدمة SQL Server...');
    stopBackend();

    const { autoFixSqlServer } = await loadPrereqChecker();
    const fixResult = await autoFixSqlServer((msg) => {
      sendSplashStatus('loading', msg);
    });

    if (fixResult.success) {
      console.log('[Main] Auto-fix succeeded, rebooting sequence...');
      await bootSequence();
    } else {
      sendSplashStatus('error', fixResult.message || 'فشل الإصلاح التلقائي. يرجى تشغيل خدمة MSSQL$SQLEXPRESS يدوياً.');
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('before-quit', () => {
  stopBackend();
});

app.on('window-all-closed', () => {
  stopBackend();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

process.on('exit', () => {
  stopBackend();
});

process.on('SIGINT', () => {
  stopBackend();
  process.exit(0);
});

process.on('SIGTERM', () => {
  stopBackend();
  process.exit(0);
});
  