import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';
import http from 'http';
import { spawn, execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

function waitForBackend(url = 'http://localhost:5000/api/health', retries = 60, intervalMs = 500) {
  return new Promise((resolve) => {
    let attempts = 0;
    const check = () => {
      attempts++;
      const req = http.get(url, (res) => {
        req.destroy();
        console.log(`[Main] Backend responsive after ${attempts} attempts (HTTP status: ${res.statusCode})`);
        resolve(true);
      });

      req.on('error', () => {
        req.destroy();
        if (attempts >= retries) {
          console.warn(`[Main] Backend health check timed out after ${retries} attempts.`);
          resolve(false);
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
    width: 420,
    height: 380,
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
  sendSplashStatus('loading', 'جاري تشغيل الخادم...');
  startBackend();

  sendSplashStatus('loading', 'جاري الاتصال بالخادم...');
  const backendReady = await waitForBackend();

  if (backendReady) {
    sendSplashStatus('loading', 'جاري تحميل الواجهة...');
    createWindow();
  } else {
    sendSplashStatus('error', 'لم يتمكن النظام من الاتصال بالخادم المحلي. تأكد من تشغيل قاعدة البيانات وأعد المحاولة.');
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
  