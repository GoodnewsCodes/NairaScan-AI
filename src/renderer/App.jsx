import React, { useState, useEffect } from 'react';
import { UploadCloud, FileText, Settings, AlertTriangle, X, Cpu, Shield, Info } from 'lucide-react';
import { cn } from './utils';
import { UploadScreen } from './screens/UploadScreen';
import { ProcessingScreen } from './screens/ProcessingScreen';
import { ResultsScreen } from './screens/ResultsScreen';
import { BackendLoading } from './components/BackendLoading';

const isElectron = typeof window !== 'undefined' && !!window.electronAPI;

function App() {
  const [appState, setAppState] = useState('upload'); // upload | processing | results
  const [activeFiles, setActiveFiles] = useState([]);  // file metadata objects
  const [filePaths, setFilePaths] = useState([]);       // real OS file paths
  const [analysisResult, setAnalysisResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isBackendReady, setIsBackendReady] = useState(false);
  const [backendInfo, setBackendInfo] = useState(null);

  // Poll backend health
  useEffect(() => {
    if (!isElectron) return;

    let timer;
    const check = async () => {
      try {
        const data = await window.electronAPI.checkHealth();
        const healthy = !!data;
        
        if (healthy !== isBackendReady) {
          console.log(`[UI] Backend status: ${healthy ? 'ONLINE' : 'OFFLINE'}`);
        }
        
        setIsBackendReady(healthy);
        if (healthy) setBackendInfo(data);
        timer = setTimeout(check, healthy ? 10000 : 2000); 
      } catch (e) {
        console.error("[UI] Health check error:", e);
        setIsBackendReady(false);
        timer = setTimeout(check, 5000);
      }
    };
    check();
    return () => clearTimeout(timer);
  }, []);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleFilesAccepted = (files, paths) => {
    setActiveFiles(files);
    setFilePaths(paths);
    setErrorMessage(null);
    setAppState('processing');
  };

  const handleProcessingComplete = (result) => {
    setAnalysisResult(result);
    setAppState('results');
  };

  const handleProcessingError = (msg) => {
    setErrorMessage(msg);
    setAppState('upload');
  };

  const handleReset = () => {
    setActiveFiles([]);
    setFilePaths([]);
    setAnalysisResult(null);
    setErrorMessage(null);
    setAppState('upload');
  };

  const [showSettings, setShowSettings] = useState(false);

  // Close settings on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setShowSettings(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex relative h-screen bg-gray-50 text-gray-800 font-sans selection:bg-primary-200 selection:text-primary-900">

      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col z-20">

        {/* Logo */}
        <div className="flex items-center gap-3 p-6 border-b border-gray-100 pt-8">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-bold shadow-md shadow-primary-500/20">
            N
          </div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">
            NairaScan <sup className="text-primary-600 font-extrabold text-xs">AI</sup>
          </h1>
        </div>

        <nav className="flex-1 p-4 space-y-1 mt-2">
          <button
            onClick={handleReset}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors group",
              appState === 'upload'
                ? "bg-primary-50 text-primary-700"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            )}
          >
            <UploadCloud
              size={20}
              className={appState === 'upload' ? "text-primary-600" : "text-gray-400 group-hover:text-gray-600"}
            />
            New Scan
          </button>

          <button
            onClick={() => analysisResult && setAppState('results')}
            disabled={!analysisResult && appState !== 'results'}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors group",
              appState === 'results'
                ? "bg-primary-50 text-primary-700"
                : "text-gray-400 cursor-default"
            )}
          >
            <FileText
              size={20}
              className={appState === 'results' ? "text-primary-600" : "text-gray-300"}
            />
            Results
            {analysisResult && (
              <span className="ml-auto text-xs bg-primary-100 text-primary-700 font-bold px-2 py-0.5 rounded-full">
                Ready
              </span>
            )}
          </button>
        </nav>

        <div className="p-4 border-t border-gray-100 bg-gray-50/50">
          <button
            onClick={() => setShowSettings(true)}
            className="w-full flex items-center gap-3 px-3 py-2 text-gray-500 hover:text-gray-800 transition-colors text-sm font-medium rounded-lg hover:bg-gray-100"
          >
            <Settings size={18} />
            Settings
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden relative bg-gray-50">

        {/* Header — flat, no blur or shadow */}
        <header className="h-16 flex items-center justify-between px-8 bg-white border-b border-gray-200 z-10 sticky top-0">
          <h2 className="text-lg font-semibold text-gray-800">
            {appState === 'upload'     && "Upload Documents"}
            {appState === 'processing' && "AI Engine Running"}
            {appState === 'results'    && "Analysis Complete"}
          </h2>
          <div className="flex items-center gap-3">
            {isBackendReady ? (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 text-xs font-bold tracking-wide rounded-full border border-green-200">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                LOCAL AI ACTIVE
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-700 text-xs font-bold tracking-wide rounded-full border border-red-200">
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                BACKEND OFFLINE
              </div>
            )}
          </div>
        </header>

        {/* Error Banner */}
        {errorMessage && (
          <div className="mx-6 mt-4 flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 animate-in slide-in-from-top-2 duration-300">
            <AlertTriangle size={18} className="shrink-0 mt-0.5" />
            <div className="flex-1 text-sm font-medium">{errorMessage}</div>
            <button onClick={() => setErrorMessage(null)} className="hover:text-red-900 transition-colors">
              <X size={16} />
            </button>
          </div>
        )}

        {/* Screen Routing */}
        {appState === 'upload' && (
          <UploadScreen onFilesAccepted={handleFilesAccepted} />
        )}
        {appState === 'processing' && (
          <ProcessingScreen
            filePaths={filePaths}
            onComplete={handleProcessingComplete}
            onError={handleProcessingError}
          />
        )}
        {appState === 'results' && (
          <ResultsScreen 
            result={analysisResult} 
            onReset={handleReset} 
            backendInfo={backendInfo}
          />
        )}

      </main>

      {/* ── Settings Modal ─────────────────────────────────────────────────── */}
      {showSettings && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setShowSettings(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Settings size={18} className="text-primary-600" />
                <h3 className="font-bold text-gray-900">Settings</h3>
              </div>
              <button
                onClick={() => setShowSettings(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="Close (Esc)"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal body */}
            <div className="p-6 space-y-5">

              {/* Model info */}
              <div className="rounded-xl bg-primary-50 border border-primary-100 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Cpu size={16} className="text-primary-600" />
                  <span className="text-sm font-bold text-primary-900">AI Model</span>
                </div>
                <p className="text-sm text-primary-800 font-semibold">
                  {backendInfo?.model_file || 'Gemma 3 · 4B Multimodal'}
                </p>
                <p className="text-xs text-primary-600 mt-0.5">
                  {backendInfo?.is_loaded ? 'Model is loaded and ready' : 'Model is pre-loading...'}
                </p>
              </div>

              {/* Privacy */}
              <div className="rounded-xl bg-green-50 border border-green-100 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Shield size={16} className="text-green-600" />
                  <span className="text-sm font-bold text-green-900">Privacy</span>
                </div>
                <p className="text-xs text-green-700 leading-relaxed">
                  NairaScan AI processes all documents <strong>offline</strong>. Your bank statements are never uploaded to any server or cloud service.
                </p>
              </div>

              {/* Supported formats */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Info size={15} className="text-gray-400" />
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Supported Banks</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {['GTBank', 'Zenith Bank', 'Access Bank', 'UBA', 'First Bank', 'Stanbic IBTC'].map((b) => (
                    <span key={b} className="px-2.5 py-1 text-xs font-semibold bg-gray-100 text-gray-600 rounded-full">{b}</span>
                  ))}
                </div>
              </div>

              {/* Version */}
              <div className="text-xs text-gray-400 flex items-center justify-between pt-1 border-t border-gray-100">
                <span>NairaScan AI · v1.0.0</span>
                <span className="text-gray-300">Press Esc to close</span>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Backend Connection Overlay */}
      {!isBackendReady && <BackendLoading />}
    </div>
  );
}

export default App;
