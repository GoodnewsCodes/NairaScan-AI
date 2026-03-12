import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, ChevronRight, X, FolderOpen } from 'lucide-react';
import { cn } from '../utils';

// Check if running inside Electron
const isElectron = typeof window !== 'undefined' && !!window.electronAPI;

export function UploadScreen({ onFilesAccepted }) {
  const [isHovering, setIsHovering] = useState(false);
  const [files, setFiles] = useState([]); // Array of { name, path, size }
  const fileInputRef = useRef(null);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsHovering(true);
  };

  const handleDragLeave = () => setIsHovering(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsHovering(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const dropped = Array.from(e.dataTransfer.files).map((f) => ({
        name: f.name,
        // In Electron, dropped files have a real path via f.path
        path: f.path || f.name,
        size: f.size,
      }));
      setFiles((prev) => [...prev, ...dropped]);
    }
  };

  const handleBrowse = async () => {
    if (isElectron) {
      // Use native OS file picker
      const picked = await window.electronAPI.openFilePicker();
      if (picked && picked.length > 0) {
        setFiles((prev) => [...prev, ...picked]);
      }
    } else {
      // Fallback: trigger hidden <input type="file"> for browser/dev mode
      fileInputRef.current?.click();
    }
  };

  const handleFileInputChange = (e) => {
    const selected = Array.from(e.target.files || []).map((f) => ({
      name: f.name,
      path: f.name, // no real OS path in browser, use name as placeholder
      size: f.size,
    }));
    if (selected.length > 0) setFiles((prev) => [...prev, ...selected]);
    // Reset so same file can be re-selected
    e.target.value = '';
  };

  const handleRemoveFile = (idx) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleStartAnalysis = () => {
    const filePaths = files.map((f) => f.path);
    onFilesAccepted(files, filePaths);
  };

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center justify-center animate-in fade-in duration-500">

      {/* Hero text */}
      <div className="w-full max-w-3xl text-center mb-10">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-4 tracking-tight">
          Analyze Bank Statements
        </h1>
        <p className="text-lg text-gray-500 max-w-xl mx-auto">
          Secure, 100% offline analysis of bank statements for GTBank, Zenith, Access, UBA and more — powered by Gemma 3 running locally.
        </p>
      </div>

      {/* Drop Zone */}
      <div
        className={cn(
          "w-full max-w-3xl border-2 border-dashed rounded-2xl p-16 flex flex-col items-center justify-center transition-all duration-300 ease-in-out cursor-pointer group bg-white",
          isHovering
            ? "border-primary-500 bg-primary-50 scale-[1.02] shadow-xl"
            : "border-gray-300 hover:border-primary-400 hover:shadow-lg shadow-sm"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleBrowse}
      >
        <div className={cn(
          "p-5 rounded-full mb-6 transition-all duration-300",
          isHovering
            ? "bg-primary-100 text-primary-600 scale-110"
            : "bg-gray-100 text-gray-400 group-hover:bg-primary-50 group-hover:text-primary-500 group-hover:-translate-y-1"
        )}>
          <UploadCloud size={48} strokeWidth={1.5} />
        </div>

        <h3 className={cn(
          "text-xl font-bold mb-2 transition-colors",
          isHovering ? "text-primary-700" : "text-gray-800"
        )}>
          Drag & Drop files here
        </h3>
        <p className="text-gray-500 mb-6 font-medium">or click to browse · PDF, PNG, JPEG</p>

        <button
          onClick={(e) => { e.stopPropagation(); handleBrowse(); }}
          className={cn(
            "px-6 py-2.5 rounded-xl font-semibold shadow-sm transition-all duration-300 active:scale-95 flex items-center gap-2",
            isHovering
              ? "bg-primary-600 text-white shadow-md hover:bg-primary-700"
              : "bg-white border-2 border-gray-200 text-gray-700 hover:border-primary-200 hover:text-primary-600"
          )}
        >
          <FolderOpen size={18} />
          Browse Files
        </button>
      </div>

      {/* Supported Formats Badges */}
      <div className="flex gap-2 mt-5 flex-wrap justify-center">
        {['GTBank', 'Zenith Bank', 'Access Bank', 'UBA', 'First Bank', 'Stanbic IBTC'].map((bank) => (
          <span
            key={bank}
            className="px-3 py-1 text-xs font-semibold text-gray-500 bg-white border border-gray-200 rounded-full shadow-sm"
          >
            {bank}
          </span>
        ))}
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="w-full max-w-3xl mt-12 animate-in slide-in-from-bottom-4 duration-500">
          <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">
            {files.length} File{files.length > 1 ? 's' : ''} Ready to Process
          </h4>
          <ul className="space-y-3">
            {files.map((file, idx) => (
              <li
                key={idx}
                className="flex items-center justify-between p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow group"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500 shrink-0">
                    <FileText size={20} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{file.name}</p>
                    <p className="text-xs text-gray-400 truncate">
                      {formatSize(file.size)}
                      {file.path && file.path !== file.name && (
                        <span className="ml-2 opacity-60">· {file.path}</span>
                      )}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveFile(idx)}
                  className="ml-4 p-1.5 text-gray-300 hover:text-red-500 transition-colors rounded-full hover:bg-red-50 opacity-0 group-hover:opacity-100 shrink-0"
                  title="Remove"
                >
                  <X size={16} />
                </button>
              </li>
            ))}
          </ul>

          <div className="mt-8 flex items-center justify-between">
            <button
              onClick={() => setFiles([])}
              className="text-sm text-gray-400 hover:text-red-500 transition-colors font-medium"
            >
              Clear all
            </button>
            <button
              onClick={handleStartAnalysis}
              className="px-8 py-3 bg-gray-900 text-white rounded-xl font-bold shadow-lg hover:bg-primary-600 hover:shadow-primary-500/25 transition-all flex items-center gap-2 group"
            >
              Start Analysis
              <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      )}
      {/* Hidden file input fallback for browser/dev mode */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg"
        multiple
        className="hidden"
        onChange={handleFileInputChange}
      />
    </div>
  );
}
