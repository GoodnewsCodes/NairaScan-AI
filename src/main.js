const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const http = require('http');

const isDev = process.env.NODE_ENV === 'development';
const BACKEND_URL = 'http://127.0.0.1:8765';

let mainWindow;

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

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: 8765,
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
    const req = http.request(
      { hostname: '127.0.0.1', port: 8765, path: '/cancel', method: 'POST' },
      (res) => { resolve({ ok: true }); }
    );
    req.on('error', () => resolve({ ok: false }));
    req.end();
  });
});

// ─── App lifecycle ──────────────────────────────────────────────────────────
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
