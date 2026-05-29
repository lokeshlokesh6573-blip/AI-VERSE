'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CinematicIntroProps {
  onComplete: () => void;
}

export default function CinematicIntro({ onComplete }: CinematicIntroProps) {
  const [phase, setPhase] = useState<'booting' | 'authenticating' | 'ready'>('booting');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Simulated boot sequence
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += Math.random() * 15;
      if (currentProgress < 100) {
        setProgress(currentProgress);
      } else {
        clearInterval(interval);
        setProgress(100);
        setPhase('authenticating');
        setTimeout(() => {
          setPhase('ready');
          setTimeout(() => {
             onComplete();
          }, 1500);
        }, 1500);
      }
    }, 150);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center overflow-hidden">
      {/* Background Grid */}
      <div className="absolute inset-0 bg-[url('https://transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 mix-blend-overlay" />
      <div className="absolute inset-0 bg-linear-to-b from-black via-transparent to-black z-10" />

      {/* Main Holographic Boot UI */}
      <div className="relative z-20 flex flex-col items-center w-full max-w-lg">
        
        {/* Core AI Ring */}
        <div className="relative w-48 h-48 mb-12 flex items-center justify-center">
           {/* Outer Rotating Ring */}
           <motion.div 
             animate={{ rotate: 360 }}
             transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
             className="absolute inset-0 border-2 border-dashed border-red-600/50 rounded-full"
           />
           {/* Inner Counter-Rotating Ring */}
           <motion.div 
             animate={{ rotate: -360 }}
             transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
             className="absolute inset-4 border border-blue-500/30 rounded-full"
           />
           {/* Pulsing Core */}
           <motion.div 
             animate={{ scale: phase === 'authenticating' ? [1, 1.2, 1] : 1 }}
             transition={{ duration: 1, repeat: phase === 'authenticating' ? Infinity : 0 }}
             className={`w-16 h-16 rounded-full shadow-[0_0_40px_rgba(255,255,255,0.2)] ${
               phase === 'ready' ? 'bg-blue-500 shadow-[0_0_60px_rgba(59,130,246,0.8)]' : 
               phase === 'authenticating' ? 'bg-red-500 shadow-[0_0_60px_rgba(239,68,68,0.8)]' : 
               'bg-white/20'
             } transition-all duration-700 blur-[2px]`}
           />

           <div className="absolute font-mono text-[9px] text-white/50 tracking-widest text-center mt-64 uppercase">
              {phase === 'booting' && 'Initializing Neural Net...'}
              {phase === 'authenticating' && 'Verifying Signature Valid...'}
              {phase === 'ready' && 'Uplink Established.'}
           </div>
        </div>

        {/* Status Text HUD */}
        <div className="w-full px-12 font-mono text-xs tracking-widest text-white/40 space-y-2 uppercase">
           <div className="flex justify-between border-b border-white/5 pb-2">
              <span>Main System</span>
              <span className={phase === 'ready' ? 'text-blue-400' : 'text-red-500 animate-pulse'}>
                {phase === 'ready' ? 'ONLINE' : 'OFFLINE'}
              </span>
           </div>
           <div className="flex justify-between border-b border-white/5 pb-2">
              <span>Memory Base</span>
              <span>{Math.floor(progress)}% LOADED</span>
           </div>
           <div className="flex justify-between">
              <span>Auth Hash</span>
              <span>{phase === 'booting' ? '...' : 'P.PARKER_X1'}</span>
           </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full max-w-sm h-1 bg-white/5 mt-12 rounded-full overflow-hidden">
           <motion.div 
             className="h-full bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.8)] rounded-full"
             initial={{ width: 0 }}
             animate={{ width: `${progress}%` }}
             transition={{ ease: "easeOut" }}
           />
        </div>

        {/* AI VERSE Splash Text */}
        <AnimatePresence>
           {phase === 'ready' && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="absolute top-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none"
              >
                  <h1 className="text-6xl font-black italic tracking-widest text-transparent bg-clip-text bg-linear-to-r from-white to-gray-400 drop-shadow-[0_0_20px_rgba(255,255,255,0.4)]">
                    AI <span className="text-red-600">VERSE</span>
                  </h1>
              </motion.div>
           )}
        </AnimatePresence>

      </div>
    </div>
  );
}
