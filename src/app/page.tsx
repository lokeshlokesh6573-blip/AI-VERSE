'use client';

import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import CinematicIntro from '@/components/CinematicIntro';
import ChatInterface from '@/components/chat/ChatInterface';
import SpiderMascot from '@/components/SpiderMascot';

export default function Home() {
  const [showIntro, setShowIntro] = useState(true);
  const [mascotState, setMascotState] = useState({
    isThinking: false,
    isTalking: false,
    isListening: false,
  });

  return (
    <main className="relative min-h-screen bg-(--bg) overflow-hidden">
      <AnimatePresence mode="wait">
        {showIntro ? (
          <motion.div
            key="intro"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
          >
            <CinematicIntro onComplete={() => setShowIntro(false)} />
          </motion.div>
        ) : (
          <motion.div
            key="app"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="h-screen flex flex-col"
          >
            {/* Subtle Background */}
            <div className="fixed inset-0 z-0 pointer-events-none">
              <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1514565131-fce0801e5785?q=80&w=2624&auto=format&fit=crop')] bg-cover bg-center opacity-[0.04]" />
              <div className="absolute inset-0 bg-linear-to-b from-(--bg) via-transparent to-(--bg)" />
              {/* Subtle grid */}
              <div
                className="absolute inset-0 opacity-[0.025]"
                style={{
                  backgroundImage: `linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)`,
                  backgroundSize: '40px 40px',
                }}
              />
            </div>

            {/* Main Chat */}
            <div className="relative z-10 flex-1 overflow-hidden">
              <ChatInterface
                onLoadingChange={(v) => setMascotState(s => ({ ...s, isThinking: v }))}
                onTalkingChange={(v) => setMascotState(s => ({ ...s, isTalking: v }))}
                onListeningChange={(v) => setMascotState(s => ({ ...s, isListening: v }))}
              />
            </div>

            {/* Spider Mascot */}
            <SpiderMascot
              isThinking={mascotState.isThinking}
              isTalking={mascotState.isTalking}
              isListening={mascotState.isListening}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
