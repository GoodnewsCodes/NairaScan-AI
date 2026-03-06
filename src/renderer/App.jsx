import React, { useState } from 'react';
import { UploadCloud, FileText, Settings, AlertTriangle, X } from 'lucide-react';
import { cn } from './utils';
import { UploadScreen } from './screens/UploadScreen';
import { ProcessingScreen } from './screens/ProcessingScreen';
import { ResultsScreen } from './screens/ResultsScreen';

function App() {
  const [appState, setAppState] = useState('upload'); // upload | processing | results
  const [activeFiles, setActiveFiles] = useState([]);  // file metadata objects
  const [filePaths, setFilePaths] = useState([]);       // real OS file paths
  const [analysisResult, setAnalysisResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

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

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex relative h-screen bg-gray-50 text-gray-800 font-sans selection:bg-primary-200 selection:text-primary-900">

      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col shadow-sm z-20">

        <div className="flex items-center gap-3 p-6 border-b border-gray-100 pt-8">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-bold shadow-md shadow-primary-500/20">
            N
          </div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent tracking-tight">
            NairaScan <sup className="text-primary-600 font-extrabold text-xs">AI</sup>
          </h1>
        </div>

        <nav className="flex-1 p-4 space-y-1 mt-2">
          <button
            onClick={handleReset}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-all group",
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
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-all group",
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
              <span className="ml-auto text-xs bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-full">
                Ready
              </span>
            )}
          </button>
        </nav>

        <div className="p-4 border-t border-gray-100 bg-gray-50/50">
          <button className="w-full flex items-center gap-3 px-3 py-2 text-gray-500 hover:text-gray-800 transition-colors text-sm font-medium rounded-lg hover:bg-gray-100">
            <Settings size={18} />
            Settings
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden relative bg-gray-50/30">

        {/* Header */}
        <header className="h-16 flex items-center justify-between px-8 bg-white/70 backdrop-blur-md border-b border-gray-200/50 z-10 sticky top-0">
          <h2 className="text-lg font-semibold text-gray-800">
            {appState === 'upload'     && "Upload Documents"}
            {appState === 'processing' && "AI Engine Running"}
            {appState === 'results'    && "Analysis Complete"}
          </h2>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 text-xs font-bold tracking-wide rounded-full border border-green-200/50 shadow-sm">
              <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse"></div>
              LOCAL AI ACTIVE
            </div>
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
          <ResultsScreen result={analysisResult} onReset={handleReset} />
        )}

      </main>
    </div>
  );
}

export default App;
