'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import audio from '@/utils/AudioEngine';

interface CinematicIntroProps {
  onComplete: () => void;
}

export default function CinematicIntro({ onComplete }: CinematicIntroProps) {
  const [phase, setPhase] = useState<'approaching' | 'landing' | 'booting' | 'authenticating' | 'ready'>('approaching');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Check session storage to skip intro if already played
    const hasPlayed = sessionStorage.getItem('ai_verse_intro_played');
    if (hasPlayed) {
      onComplete();
      return;
    }

    // Phases of animation:
    // 1. Approaching (Swinging in)
    setTimeout(() => {
      audio.playWebShoot();
      setPhase('landing');
    }, 2000);

    // 2. Landing & Impact
    setTimeout(() => {
      audio.playLandingRumble();
      setPhase('booting');

      const hasSpoken = sessionStorage.getItem('ai_verse_greeting_spoken');

      if (!hasSpoken) {
        const { getVoiceAssistant } = require('@/lib/voice-assistant');
        const voice = getVoiceAssistant();
        voice.speak("The wait is over. AI Verse has arrived.");
        sessionStorage.setItem('ai_verse_greeting_spoken', 'true');
      }
    }, 4500);

    // 3. Booting sequence
    let currentProgress = 0;
    const interval = setInterval(() => {
      if (phase !== 'booting' && phase !== 'authenticating' && phase !== 'ready') return;

      // Play a small hover click every 20 progress points to simulate processing sound
      if (Math.floor(currentProgress / 10) !== Math.floor((currentProgress + 10) / 10)) {
        audio.playHover();
      }

      currentProgress += Math.random() * 10;
      if (currentProgress < 100) {
        setProgress(currentProgress);
      } else {
        clearInterval(interval);
        audio.playSelect();
        setProgress(100);
        setPhase('authenticating');
        setTimeout(() => {
          setPhase('ready');
          audio.playSelect();
          setTimeout(() => {
            sessionStorage.setItem('ai_verse_intro_played', 'true');
            onComplete();
          }, 2000);
        }, 1500);
      }
    }, 200);

    return () => clearInterval(interval);
  }, [phase, onComplete]);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center overflow-hidden">
      {/* Background Grid */}
      <div className="absolute inset-0 bg-[url('https://transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 mix-blend-overlay" />
      <div className="absolute inset-0 bg-linear-to-b from-black via-transparent to-black z-10" />

      {/* Spider Arrival Sequence */}
      <AnimatePresence>
        {(phase === 'approaching' || phase === 'landing') && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 2, filter: 'blur(20px)' }}
            transition={{ duration: 1 }}
            className="absolute inset-0 flex items-center justify-center z-30"
          >
            {/* Character Container */}
            <motion.div
              initial={{ x: -800, y: -400, rotate: -45 }}
              animate={phase === 'approaching' ?
                { x: 0, y: 0, rotate: 0 } :
                { y: [0, -35, 0], scale: [1, 1.05, 1], rotate: [0, 5, 0] }
              }
              transition={{
                type: 'spring', damping: 12, stiffness: 40,
                y: { duration: 0.6, ease: "easeOut" },
                scale: { type: "tween", duration: 0.5 },
                rotate: { type: "tween", duration: 0.5 }
              } as any}
              className="relative flex items-center justify-center"
            >
              {/* Dynamic Web line */}
              <motion.div
                initial={{ height: '300vh', opacity: 1, rotate: 15 }}
                animate={phase === 'landing' ? { height: 0, opacity: 0 } : { height: '300vh', opacity: 0.8 }}
                transition={{ duration: 1, ease: "anticipate" }}
                className="absolute bottom-[75%] left-1/2 w-[3px] bg-white/90 shadow-[0_0_20px_#fff] origin-bottom -translate-x-1/2"
              />

              {/* THE HERO CHARACTER - SPIDER-MAN INSPIRED */}
              <motion.div
                className="relative flex flex-col items-center"
                animate={{
                  y: phase === 'landing' ? [0, -15, 0] : 0,
                  scale: phase === 'landing' ? [1.1, 1] : 1
                }}
                transition={{ duration: 0.4 }}
              >
                {/* Head / Mask */}
                <div className="relative w-24 h-28 bg-red-600 rounded-[50%_50%_45%_45%] border-b-4 border-red-800 shadow-[0_10px_30px_rgba(220,38,38,0.5)] overflow-hidden flex flex-col items-center pt-6">
                  {/* Web Patterns */}
                  <div className="absolute inset-0 opacity-20" style={{
                    backgroundImage: 'radial-gradient(circle at center, transparent 0, transparent 30px, #000 31px, transparent 32px)',
                    backgroundSize: '100% 100%'
                  }} />
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-full bg-black/20" />
                  <div className="absolute top-1/2 left-0 w-full h-0.5 bg-black/20" />

                  {/* Iconic slanting Eyes */}
                  <div className="flex gap-2 z-10">
                    {/* Left Eye */}
                    <motion.div
                      className="w-9 h-11 bg-white rounded-[80%_20%_60%_20%] border-4 border-black shadow-[0_0_10px_rgba(255,255,255,0.8)] -rotate-12"
                      animate={{ scaleY: [1, 0.1, 1], scaleX: [1, 1.1, 1] }}
                      transition={{ repeat: Infinity, duration: 5, times: [0, 0.05, 0.1], delay: 1 }}
                    />
                    {/* Right Eye */}
                    <motion.div
                      className="w-9 h-11 bg-white rounded-[20%_80%_20%_60%] border-4 border-black shadow-[0_0_10px_rgba(255,255,255,0.8)] rotate-12"
                      animate={{ scaleY: [1, 0.1, 1], scaleX: [1, 1.1, 1] }}
                      transition={{ repeat: Infinity, duration: 5, times: [0, 0.05, 0.1], delay: 1.1 }}
                    />
                  </div>
                </div>

                {/* Collar & Suit Details */}
                <div className="w-18 h-10 bg-blue-700 rounded-b-2xl -mt-4 shadow-xl flex items-center justify-center">
                  <div className="w-5 h-5 bg-black rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)] border border-red-500/30" />
                </div>

                {/* Landing SFX (Pulse) */}
                {phase === 'landing' && (
                  <motion.div
                    initial={{ scale: 0.2, opacity: 1 }}
                    animate={{ scale: 15, opacity: 0 }}
                    transition={{ duration: 1, ease: "circOut" }}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full border-4 border-white shadow-[0_0_150px_#fff]"
                  />
                )}
              </motion.div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Holographic Boot UI */}
      <AnimatePresence>
        {(phase === 'booting' || phase === 'authenticating' || phase === 'ready') && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1 }}
            className="relative z-20 flex flex-col items-center w-full max-w-lg"
          >

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
                transition={{ duration: 1, repeat: phase === 'authenticating' ? Infinity : 0, ease: 'easeInOut' }}
                className={`w-16 h-16 rounded-full shadow-[0_0_40px_rgba(255,255,255,0.2)] ${phase === 'ready' ? 'bg-blue-500 shadow-[0_0_60px_rgba(59,130,246,0.8)]' :
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

          </motion.div>
        )}
      </AnimatePresence>

      {/* Skip Button */}
      <button
        onClick={onComplete}
        className="absolute bottom-8 right-8 px-4 py-2 text-[10px] text-white/30 hover:text-white/70 uppercase tracking-widest font-mono z-50 transition-colors"
      >
        [ Skip Sequence ]
      </button>
    </div>
  );
}
