'use client';

import React, { useState } from 'react';
import CinematicIntro from '@/components/CinematicIntro';
import ChatInterface from '@/components/ChatInterface';
import SpiderMascot from '@/components/SpiderMascot';
import { AnimatePresence, motion } from 'framer-motion';

export default function Home() {
  const [showIntro, setShowIntro] = useState(true);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [isAiTalking, setIsAiTalking] = useState(false);
  const [isAiListening, setIsAiListening] = useState(false);

  return (
    <main className="relative min-h-screen bg-black overflow-hidden font-sans">
      <AnimatePresence mode="wait">
        {showIntro ? (
          <motion.div
            key="intro"
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
          >
            <CinematicIntro onComplete={() => setShowIntro(false)} />
          </motion.div>
        ) : (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
            className="relative min-h-screen"
          >
            {/* Animated City Background (Simplified) */}
            <div className="fixed inset-0 z-0 opacity-20">
               <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1514565131-fce0801e5785?q=80&w=2624&auto=format&fit=crop')] bg-cover bg-center grayscale border-b border-red-500/10" />
               <div className="absolute inset-0 bg-linear-to-t from-black via-black/50 to-transparent" />
            </div>

            {/* Main Chat Layout */}
            <div className="relative z-10 h-screen">
               <ChatInterface
                 onLoadingChange={setIsAiThinking}
                 onTalkingChange={setIsAiTalking}
                 onListeningChange={setIsAiListening}
               />
            </div>

            {/* Mascot */}
            <SpiderMascot isThinking={isAiThinking} isTalking={isAiTalking} isListening={isAiListening} />

            {/* HUD Elements */}
            <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-20 border-20 border-white/5 opacity-30 select-none">
               <div className="absolute top-8 left-8 text-[10px] text-blue-400 font-black tracking-widest uppercase">
                  System: AI Verse OS // Dashboard: Cinematic
               </div>
               <div className="absolute bottom-8 left-8 text-[10px] text-red-500 font-black tracking-widest uppercase">
                  Auth_Signature: Peter_Parker_Alpha
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </main>
  );
}
