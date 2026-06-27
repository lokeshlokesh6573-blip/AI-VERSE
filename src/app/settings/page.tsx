'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Settings, Wrench } from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-black text-white font-sans flex flex-col items-center justify-center relative overflow-hidden">
      {/* Subtle grid background */}
      <div className="fixed inset-0 z-0 opacity-10">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?q=80&w=2574&auto=format&fit=crop')] bg-cover bg-center grayscale" />
        <div className="absolute inset-0 bg-linear-to-b from-black via-transparent to-black" />
      </div>

      {/* Scanline overlay */}
      <div className="fixed inset-0 z-0 pointer-events-none"
        style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.015) 2px, rgba(255,255,255,0.015) 4px)' }} />

      <div className="relative z-10 flex flex-col items-center gap-8 text-center px-6">
        {/* Back button */}
        <button
          onClick={() => router.push('/')}
          className="absolute top-0 left-0 p-3 bg-zinc-900/50 border border-white/10 rounded-2xl hover:bg-zinc-800 transition-all hover:scale-105 active:scale-95 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-400"
          style={{ position: 'fixed', top: '24px', left: '24px' }}
        >
          <ArrowLeft size={16} />
          Back
        </button>

        {/* Icon */}
        <motion.div
          animate={{ rotate: [0, 15, -15, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="w-24 h-24 bg-zinc-900 border border-red-500/20 rounded-3xl flex items-center justify-center shadow-2xl shadow-red-900/20"
        >
          <Wrench className="text-red-500" size={40} />
        </motion.div>

        {/* Title */}
        <div>
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl font-black font-orbitron tracking-tighter text-white mb-2"
          >
            SYSTEM_SETTINGS
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-zinc-500 text-[10px] uppercase tracking-[0.3em] font-bold"
          >
            Module temporarily offline
          </motion.p>
        </div>

        {/* Status box */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="px-8 py-6 bg-zinc-900/60 border border-white/5 rounded-2xl backdrop-blur-sm max-w-sm w-full"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
            <span className="text-yellow-500 text-[10px] font-bold uppercase tracking-widest">Under Maintenance</span>
          </div>
          <p className="text-zinc-400 text-sm leading-relaxed">
            Settings panel is being upgraded. Core AI functionality remains fully operational.
          </p>
        </motion.div>

        {/* Back to chat button */}
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          onClick={() => router.push('/')}
          className="px-8 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl tracking-widest uppercase text-xs transition-all active:scale-95 hover:shadow-lg hover:shadow-red-900/40"
        >
          Return to Core
        </motion.button>
      </div>

      {/* Bottom accent line */}
      <div className="fixed bottom-0 left-0 w-full h-0.5 bg-linear-to-r from-transparent via-red-500/50 to-transparent opacity-30" />
    </main>
  );
}