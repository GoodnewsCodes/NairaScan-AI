import React, { useState, useEffect, useRef } from 'react';
import { Loader2, XCircle } from 'lucide-react';

const isElectron = typeof window !== 'undefined' && !!window.electronAPI;

export function ProcessingScreen({ filePaths = [], onComplete, onError }) {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('Initializing Gemma 3 Engine...');
  const [logs, setLogs] = useState([
    '> loading model [gemma-3-4b-it-q4_k_m.gguf]',
    '> context length: 4096 tokens',
  ]);
  const logsEndRef = useRef(null);

  const appendLog = (msg) => setLogs((prev) => [...prev.slice(-20), msg]);

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  useEffect(() => {
    if (!isElectron || filePaths.length === 0) {
      onError('Analysis failed: Environment not supported or no files selected.');
      return;
    }

    // ── Real Electron path ──────────────────────────────────────────────
    appendLog(`> sending ${filePaths.length} file(s) to backend...`);

    // Listen for streamed progress events from main process
    window.electronAPI.onProgress((data) => {
      if (data.progress !== undefined) setProgress(data.progress);
      if (data.message) {
        setStatus(data.message);
        appendLog(`> ${data.message}`);
      }
    });

    window.electronAPI.analyzeFiles(filePaths)
      .then((result) => {
        appendLog('> analysis complete ✓');
        window.electronAPI.removeProgressListener();
        setTimeout(() => onComplete(result), 600);
      })
      .catch((err) => {
        appendLog(`> ERROR: ${err.message}`);
        window.electronAPI.removeProgressListener();
        onError(err.message);
      });

    return () => {
      window.electronAPI.removeProgressListener();
    };
  }, [filePaths, onComplete, onError]);

  const handleCancel = async () => {
    if (isElectron) await window.electronAPI.cancelAnalysis();
    onError('Analysis was cancelled by user.');
  };

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white animate-in fade-in duration-500">
      <div className="max-w-md w-full text-center">

        {/* Progress Ring */}
        <div className="relative w-36 h-36 mx-auto mb-8 flex items-center justify-center">
          {/* Track */}
          <svg className="absolute inset-0 w-full h-full text-gray-100" viewBox="0 0 100 100">
            <circle className="stroke-current" strokeWidth="7" cx="50" cy="50" r="42" fill="transparent" />
          </svg>
          {/* Fill */}
          <svg
            className="absolute inset-0 w-full h-full text-primary-600 transform -rotate-90 transition-all duration-700 ease-out"
            viewBox="0 0 100 100"
          >
            <circle
              className="stroke-current"
              strokeWidth="7"
              strokeLinecap="round"
              cx="50"
              cy="50"
              r="42"
              fill="transparent"
              strokeDasharray={`${progress * 2.639} 263.9`}
            />
          </svg>
          <span className="text-3xl font-extrabold text-gray-800 tabular-nums">{progress}%</span>
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-2">Analyzing Statement</h2>
        <div className="flex items-center justify-center gap-2 text-gray-500 h-6 mb-8">
          <Loader2 size={16} className="animate-spin text-primary-500 shrink-0" />
          <span className="text-sm truncate">{status}</span>
        </div>

        {/* Log terminal */}
        <div className="bg-gray-950 rounded-xl p-4 text-left border border-gray-800 shadow-inner">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            Local Model Logs
          </div>
          <div className="font-mono text-xs text-green-400 space-y-1.5 h-28 overflow-y-auto scroll-smooth pr-1">
            {logs.map((log, i) => (
              <p key={i} className="leading-relaxed opacity-80 animate-in fade-in slide-in-from-bottom-1 duration-300">
                {log}
              </p>
            ))}
            <div ref={logsEndRef} />
          </div>
        </div>

        {/* Cancel */}
        <button
          onClick={handleCancel}
          className="mt-6 flex items-center gap-2 text-sm text-gray-400 hover:text-red-500 transition-colors mx-auto font-medium"
        >
          <XCircle size={16} />
          Cancel Analysis
        </button>
      </div>
    </div>
  );
}
