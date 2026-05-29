'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SpiderMascotProps {
  isThinking: boolean;
  isTalking: boolean;
  isListening?: boolean;
}

export default function SpiderMascot({ isThinking, isTalking, isListening = false }: SpiderMascotProps) {
  const [pulseScale, setPulseScale] = useState(1);

  // Audio visualization effect mock
  useEffect(() => {
    if (!isTalking) {
      setPulseScale(1);
      return;
    }
    const interval = setInterval(() => {
      setPulseScale(1 + Math.random() * 0.15); // Pulsate with voice
    }, 100);
    return () => clearInterval(interval);
  }, [isTalking]);

  const getRingColor = () => {
    if (isListening) return 'border-green-500 shadow-green-500/50';
    if (isThinking) return 'border-blue-500 shadow-blue-500/50';
    if (isTalking) return 'border-red-500 shadow-red-500/50';
    return 'border-blue-600/30 shadow-blue-600/10';
  };

  const getAvatarGlow = () => {
    if (isListening) return 'bg-green-600/20';
    if (isThinking) return 'bg-blue-600/20';
    if (isTalking) return 'bg-red-600/25';
    return 'bg-blue-950/20 group-hover:bg-blue-600/10';
  };

  const getCoreColor = () => {
    if (isListening) return 'bg-green-400';
    if (isThinking) return 'bg-blue-400';
    if (isTalking) return 'bg-red-500';
    return 'bg-blue-500';
  }

  return (
    <div className="fixed bottom-32 right-8 z-40">
      <motion.div
        animate={{
          y: [0, -10, 0],
        }}
        transition={{
          y: { duration: 4, repeat: Infinity, ease: 'easeInOut' }
        }}
        className="relative group cursor-pointer"
      >
        {/* Holographic orbital rings */}
        <div className={`absolute -inset-8 border rounded-full transition-all duration-1000 shadow-lg ${getRingColor()} ${
          isThinking ? 'animate-[spin_2s_linear_infinite]' : 'animate-[spin_10s_linear_infinite]'
        } opacity-50`} />
        
        <div className={`absolute -inset-4 border-2 border-dashed rounded-full transition-all duration-500 ${getRingColor()} ${
          isListening || isTalking ? 'animate-[spin_4s_linear_infinite_reverse]' : 'animate-[spin_15s_linear_infinite_reverse]'
        }`} />

        {/* Ambient Glow */}
        <div className={`absolute inset-0 rounded-full blur-2xl transition-all duration-500 ${getAvatarGlow()} scale-150`} />

        {/* The Orb */}
        <motion.div 
           animate={{ scale: pulseScale }}
           transition={{ type: 'spring', damping: 10, stiffness: 300 }}
           className="relative w-24 h-24 bg-black/80 border border-white/20 rounded-full flex items-center justify-center backdrop-blur-xl shadow-2xl overflow-hidden"
        >
          {/* Inner Energy Core */}
          <div className="absolute inset-2 rounded-full border border-white/10 opacity-50" />
          <div className="absolute inset-4 rounded-full border border-white/5 opacity-50 animate-pulse" />
          
          <div className={`w-8 h-8 rounded-full ${getCoreColor()} blur-[10px] animate-pulse transition-colors duration-500`} />
          <div className={`absolute w-3 h-3 rounded-full bg-white shadow-[0_0_15px_#fff] transition-all duration-500`} />

          {/* Holographic Spider Logo overlay */}
          <div className="absolute inset-0 flex items-center justify-center opacity-40">
             <svg viewBox="0 0 100 100" className="w-12 h-12">
               {/* Simplified sleek spider logo */}
               <path d="M50 30 C50 30, 48 35, 45 40 L35 25 M50 30 C50 30, 52 35, 55 40 L65 25" stroke="#ffffff" strokeWidth="2" fill="none" />
               <path d="M25 50 L45 50 L50 65 L55 50 L75 50" stroke="#ffffff" strokeWidth="2" fill="none" />
               <path d="M30 75 L45 60 M70 75 L55 60" stroke="#ffffff" strokeWidth="2" fill="none" />
               <circle cx="50" cy="50" r="4" fill="#ffffff" />
             </svg>
          </div>
        </motion.div>

        {/* UI state tags */}
        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-black/80 px-3 py-1 rounded border border-white/10 text-[8px] text-white/70 tracking-[0.2em] font-black uppercase whitespace-nowrap shadow-xl">
          {isListening ? (
            <span className="text-green-400">AUDIO INGEST...</span>
          ) : isThinking ? (
            <span className="text-blue-400">PROCESSING...</span>
          ) : isTalking ? (
            <span className="text-red-500">TRANSMITTING...</span>
          ) : (
            <span>IDLE_CORE</span>
          )}
        </div>
      </motion.div>
    </div>
  );
}
