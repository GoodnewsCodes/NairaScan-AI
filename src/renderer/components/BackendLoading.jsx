import React, { useState, useEffect } from 'react';
import { Cpu, Sparkles, ShieldCheck, Zap, Layers, Fingerprint } from 'lucide-react';

export const BackendLoading = () => {
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('Initializing Systems');

  const statusMessages = [
    'Initializing Systems',
    'Loading Multimodal Weights',
    'Verifying Local Security',
    'Configuring AI Engine',
    'Optimizing OCR Pipeline',
    'Securing Local Database',
    'Readying Intelligence'
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) return 0;
        return prev + 0.5;
      });
    }, 50);

    const msgTimer = setInterval(() => {
      setStatusText(prev => {
        const currentIndex = statusMessages.indexOf(prev);
        const nextIndex = (currentIndex + 1) % statusMessages.length;
        return statusMessages[nextIndex];
      });
    }, 2000);

    return () => {
      clearInterval(timer);
      clearInterval(msgTimer);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gray-950 text-white transition-all duration-1000 animate-in fade-in">
      
      {/* Background Neural Grid Effect */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #10b981 1px, transparent 0)', backgroundSize: '40px 40px' }}>
      </div>

      {/* Radial Glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary-900/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="relative flex flex-col items-center max-w-md w-full px-8 text-center">
        
        {/* Central Logo/Icon Area */}
        <div className="relative mb-16">
          <div className="absolute inset-0 bg-primary-500/10 rounded-full blur-3xl animate-pulse"></div>
          
          <div className="relative group">
            {/* Hexagon Frame */}
            <div className="w-32 h-32 flex items-center justify-center relative translate-y-2">
              <div className="absolute inset-0 bg-primary-500/10 rotate-45 rounded-2xl animate-spin-slow"></div>
              <div className="absolute inset-0 border-2 border-primary-500/20 rotate-12 rounded-2xl animate-spin-slow" style={{ animationDuration: '8s' }}></div>
              
              <div className="relative w-20 h-20 rounded-2xl bg-gray-900 border border-primary-500/30 flex items-center justify-center shadow-2xl shadow-primary-500/20">
                <Cpu size={40} className="text-primary-400 animate-pulse" />
              </div>
            </div>

            {/* Orbitals */}
            <div className="absolute -top-4 -right-4 w-8 h-8 rounded-full bg-gray-900 border border-primary-500/50 flex items-center justify-center animate-bounce">
              <Zap size={14} className="text-gold-400" />
            </div>
            <div className="absolute -bottom-2 -left-6 w-10 h-10 rounded-lg bg-gray-900 border border-primary-500/30 flex items-center justify-center animate-float">
              <Layers size={16} className="text-primary-300" />
            </div>
          </div>
        </div>

        {/* Title and App Info */}
        <div className="space-y-6 w-full">
          <div>
            <h1 className="text-4xl font-black tracking-tighter mb-2">
               NAIRA<span className="text-primary-500">SCAN</span> <span className="font-light text-gray-500">AI</span>
            </h1>
            <div className="flex items-center justify-center gap-4 text-[10px] font-bold tracking-[0.2em] text-gray-500 uppercase">
              <span>Secure</span>
              <span className="w-1 h-1 bg-gray-700 rounded-full"></span>
              <span>Offline</span>
              <span className="w-1 h-1 bg-gray-700 rounded-full"></span>
              <span>Private</span>
            </div>
          </div>

          {/* Progress Section */}
          <div className="space-y-4 pt-4">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-widest text-primary-400/80">
              <span className="animate-pulse">{statusText}</span>
              <span className="font-mono text-gray-500">{Math.round(progress)}%</span>
            </div>
            
            <div className="relative h-1.5 w-full bg-gray-900 rounded-full overflow-hidden border border-gray-800">
              <div 
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary-600 to-primary-400 transition-all duration-300 shadow-[0_0_15px_rgba(16,185,129,0.5)]"
                style={{ width: `${progress}%` }}
              >
                {/* Flowing light effect */}
                <div className="absolute inset-0 bg-white/20 animate-beam"></div>
              </div>
            </div>
          </div>

          {/* Verification Badges */}
          <div className="grid grid-cols-2 gap-3 pt-4">
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-900/50 border border-gray-800 rounded-xl text-left">
              <ShieldCheck size={14} className="text-primary-500" />
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tight">Security Check Pass</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-900/50 border border-gray-800 rounded-xl text-left">
              <Fingerprint size={14} className="text-gold-500" />
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tight">Encryption Active</span>
            </div>
          </div>
        </div>

      </div>

      {/* Version Tag */}
      <div className="absolute bottom-10 font-mono text-[10px] text-gray-700 tracking-widest">
        SYSTEM_V1.0.0 // BOOT_SEQUENCE_INIT
      </div>
    </div>
  );
};
