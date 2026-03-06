const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Open native OS file picker, returns array of file objects {name, path, size}
  openFilePicker: () => ipcRenderer.invoke('dialog:openFile'),

  // Send file paths to the Python backend for analysis
  analyzeFiles: (filePaths) => ipcRenderer.invoke('backend:analyzeFiles', filePaths),

  // Cancel an ongoing analysis
  cancelAnalysis: () => ipcRenderer.invoke('backend:cancelAnalysis'),

  // Listen for progress updates streamed from the main process
  onProgress: (callback) => {
    ipcRenderer.on('analysis:progress', (_event, data) => callback(data));
  },

  // Remove the progress listener (cleanup)
  removeProgressListener: () => {
    ipcRenderer.removeAllListeners('analysis:progress');
  },
});
