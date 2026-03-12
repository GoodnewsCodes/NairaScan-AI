const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
let BACKEND_URL = 'http://127.0.0.1:8765';

console.log(`[Electron] Mode: ${isDev ? 'Development' : 'Production'}`);

let mainWindow;
let backendProcess;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    titleBarStyle: 'hiddenInset',
    show: false, // don't flash before ready
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

// ─── Backend Management ──────────────────────────────────────────────────
function startBackend() {
  const backendDir = path.join(__dirname, '../backend');
  const venvPython = path.join(backendDir, 'venv', 'Scripts', 'python.exe');
  const pythonPath = fs.existsSync(venvPython) ? venvPython : 'python';

  console.log(`[Electron] Starting backend via: ${pythonPath}`);

  backendProcess = spawn(pythonPath, ['app.py'], {
    cwd: backendDir,
    shell: true, // needed for some environments/pathing
  });

  backendProcess.stdout.on('data', (data) => {
    console.log(`[Backend]: ${data}`);
  });

  backendProcess.stderr.on('data', (data) => {
    console.error(`[Backend Error]: ${data}`);
  });

  backendProcess.on('close', (code) => {
    console.log(`[Backend] Process exited with code ${code}`);
    backendProcess = null;
  });
}

async function checkBackendHealth(retries = 30) {
  const targets = [BACKEND_URL, 'http://localhost:8765', 'http://127.0.0.1:8765'];
  
  for (let i = 0; i < retries; i++) {
    for (const target of targets) {
      const url = `${target}/health`;
      try {
        const data = await new Promise((resolve, reject) => {
          const req = http.get(url, (res) => {
            if (res.statusCode === 200) {
              let body = '';
              res.on('data', chunk => body += chunk);
              res.on('end', () => {
                try {
                  resolve(JSON.parse(body));
                } catch (e) {
                  reject(new Error('Invalid JSON response'));
                }
              });
            }
            else reject(new Error(`Status: ${res.statusCode}`));
          });
          req.on('error', reject);
          req.setTimeout(3000, () => {
            req.destroy();
            reject(new Error('Timeout'));
          });
        });
        
        if (BACKEND_URL !== target) {
          console.log(`[Electron] Switching BACKEND_URL to ${target}`);
          BACKEND_URL = target;
        }
        return data; 
      } catch (e) {
        // Log error only if it's a one-shot check or last retry
        if (retries === 1) {
          console.log(`[Electron] Health check failed for ${target}: ${e.message}`);
        }
      }
    }
    if (retries > 1) {
      console.log(`[Electron] Health check failed (Attempt ${i + 1}/${retries})...`);
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  return null;
}

// ─── IPC: Check backend health ─────────────────────────────────────────────
ipcMain.handle('backend:health', async () => {
  return await checkBackendHealth(1); // One-shot from UI
});

// ─── IPC: Open native file picker ──────────────────────────────────────────
ipcMain.handle('dialog:openFile', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Bank Statements',
    filters: [
      { name: 'Documents & Images', extensions: ['pdf', 'png', 'jpg', 'jpeg'] },
    ],
    properties: ['openFile', 'multiSelections'],
  });

  if (canceled || filePaths.length === 0) return [];

  // Return an array of file metadata objects (safe to pass over IPC)
  const fs = require('fs');
  return filePaths.map((filePath) => {
    const stats = fs.statSync(filePath);
    return {
      name: path.basename(filePath),
      path: filePath,
      size: stats.size,
    };
  });
});

// ─── IPC: Send files to Python backend ─────────────────────────────────────
ipcMain.handle('backend:analyzeFiles', async (_event, filePaths) => {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ file_paths: filePaths });

    const url = new URL(BACKEND_URL);
    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: '/analyze',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;

          // Stream progress updates (newline-delimited JSON)
          const lines = data.split('\n').filter(Boolean);
          lines.forEach((line) => {
            try {
              const parsed = JSON.parse(line);
              if (parsed.type === 'progress' && mainWindow) {
                mainWindow.webContents.send('analysis:progress', parsed);
              }
            } catch {
              // not JSON yet, keep buffering
            }
          });
        });

        res.on('end', () => {
          try {
            // The last line should be the final result
            const lines = data.split('\n').filter(Boolean);
            const lastLine = lines[lines.length - 1];
            resolve(JSON.parse(lastLine));
          } catch (e) {
            reject(new Error('Failed to parse backend response: ' + data));
          }
        });
      }
    );

    req.on('error', (err) => {
      // Backend not running — return a structured error
      reject(new Error('Python backend is not running. Start the backend first. (' + err.message + ')'));
    });

    req.setTimeout(120000, () => {
      req.destroy();
      reject(new Error('Backend request timed out after 120 seconds.'));
    });

    req.write(body);
    req.end();
  });
});

// ─── IPC: Cancel ongoing analysis ──────────────────────────────────────────
ipcMain.handle('backend:cancelAnalysis', async () => {
  return new Promise((resolve) => {
    const url = new URL(BACKEND_URL);
    const req = http.request(
      { hostname: url.hostname, port: url.port, path: '/cancel', method: 'POST' },
      (res) => { resolve({ ok: true }); }
    );
    req.on('error', () => resolve({ ok: false }));
    req.end();
  });
});

// ─── App lifecycle ──────────────────────────────────────────────────────────
app.whenReady().then(() => {
  startBackend();
  createWindow();

  // Non-blocking health check
  checkBackendHealth().then(isHealthy => {
    if (!isHealthy) {
       console.error('[Electron] Backend failed to start or respond after retries.');
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('will-quit', () => {
  if (backendProcess) {
    console.log('[Electron] Shutting down backend...');
    // In Windows, taskkill might be needed for tree kill if shell=true
    if (process.platform === 'win32') {
      const { exec } = require('child_process');
      exec(`taskkill /pid ${backendProcess.pid} /T /F`);
    } else {
      backendProcess.kill();
    }
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
