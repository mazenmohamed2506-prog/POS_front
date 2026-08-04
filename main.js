import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
let apiProcess = null;

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

  // mainWindow.webContents.openDevTools();

  if (app.isPackaged) {
    // In production, load the built Vue app
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
    mainWindow.setMenu(null); // Optional: remove the default menu for a cleaner look
  } else {
    // In development, load from Vite dev server
    mainWindow.loadURL('http://localhost:5173');
    // mainWindow.webContents.openDevTools();
  }

  // Ensure window is fully loaded before showing to prevent blank flashes
  // and force focus so that keyboard events are immediately captured.
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });
}

function startApi() {
  if (!app.isPackaged) return;

  const apiPath = path.join(process.resourcesPath, 'api', 'POS.exe');

  apiProcess = spawn(apiPath, [], {
    cwd: path.join(process.resourcesPath, 'api'),
    detached: false,
    shell: false
  });

  apiProcess.stdout.on('data', (data) => {
    console.log(`API stdout: ${data}`);
  });

  apiProcess.stderr.on('data', (data) => {
    console.error(`API stderr: ${data}`);
  });

  apiProcess.on('close', (code) => {
    console.log(`API process exited with code ${code}`);
    apiProcess = null;
  });
}

function killApi() {
  if (apiProcess) {
    try {
      // Use taskkill to forcefully kill the API process and any children
      spawn('taskkill', ['/pid', apiProcess.pid, '/f', '/t']);
      apiProcess = null;
    } catch (e) {
      console.error('Failed to kill API process', e);
    }
  }
}

app.whenReady().then(() => {
  startApi();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  killApi();
});
