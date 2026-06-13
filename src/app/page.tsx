'use client';

import React, { useState, useEffect, Suspense } from 'react';
import CinematicIntro from '@/components/CinematicIntro';
import ChatInterface from '@/components/ChatInterface';
import SpiderMascot from '@/components/SpiderMascot';
import AuthModal from '@/components/auth/AuthModal';
import { useAuth } from '@/context/AuthContext';
import { useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Lock, ShieldAlert } from 'lucide-react';

function HomeContent() {
  const { user, loading } = useAuth();
  const searchParams = useSearchParams();
  const [showIntro, setShowIntro] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [isAiTalking, setIsAiTalking] = useState(false);
  const [isAiListening, setIsAiListening] = useState(false);

  // Check for auth requirement in URL
  useEffect(() => {
    if (searchParams.get('auth') === 'required') {
      setShowIntro(false);
      setIsAuthModalOpen(true);
    }
  }, [searchParams]);

  // Open auth modal if user is not logged in and intro is done
  useEffect(() => {
    if (!loading && !user && !showIntro) {
      setIsAuthModalOpen(true);
    }
  }, [user, loading, showIntro]);


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
            {/* Animated City Background */}
            <div className="fixed inset-0 z-0 opacity-20">
               <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1514565131-fce0801e5785?q=80&w=2624&auto=format&fit=crop')] bg-cover bg-center grayscale border-b border-red-500/10" />
               <div className="absolute inset-0 bg-linear-to-t from-black via-black/50 to-transparent" />
            </div>

            {/* Main Chat Layout or Auth Gate */}
            <div className="relative z-10 h-screen">
               {user ? (
                 <div className="flex h-full w-full overflow-hidden">
                   <ChatInterface
                     onLoadingChange={setIsAiThinking}
                     onTalkingChange={setIsAiTalking}
                     onListeningChange={setIsAiListening}
                   />
                 </div>
               ) : (
                 <div className="h-full flex flex-col items-center justify-center p-6 text-center">
                    <div className="w-20 h-20 bg-zinc-900 border border-white/10 rounded-3xl flex items-center justify-center mb-6 shadow-2xl">
                       <Lock className="text-zinc-500" size={32} />
                    </div>
                    <h2 className="text-2xl font-black font-orbitron tracking-widest text-white mb-2 underline decoration-red-600/50 underline-offset-8">ACCESS_DENIED</h2>
                    <p className="text-zinc-500 text-sm max-w-xs uppercase tracking-widest leading-loose">
                      Biometric signature not found. <br />
                      <span className="text-red-500/80">Please authenticate to access AI Verse core.</span>
                    </p>
                    <button 
                      onClick={() => setIsAuthModalOpen(true)}
                      className="mt-8 px-8 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl tracking-widest uppercase text-xs transition-all active:scale-95"
                    >
                      Retry Protocol
                    </button>
                 </div>
               )}
            </div>

            {/* Mascot */}
            <SpiderMascot isThinking={isAiThinking} isTalking={isAiTalking} isListening={isAiListening} />

            {/* HUD Elements */}
            <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-20 border-20 border-white/5 opacity-30 select-none">
               <div className="absolute top-8 left-8 text-[10px] text-blue-400 font-black tracking-widest uppercase flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
                  System: AI Verse OS // Dashboard: Cinematic
               </div>
               <div className="absolute bottom-8 left-8 text-[10px] text-red-500 font-black tracking-widest uppercase flex items-center gap-2">
                  <ShieldAlert size={12} />
                  Auth_Signature: {user ? user.email?.split('@')[0].toUpperCase() : 'PETER_PARKER_ALPHA'}
               </div>
            </div>

            {/* Auth Modal */}
            <AuthModal 
              isOpen={isAuthModalOpen} 
              onClose={() => setIsAuthModalOpen(false)} 
            />
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
       <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="text-red-600 font-orbitron animate-pulse uppercase tracking-[0.3em] font-black text-xs">
             Loading OS...
          </div>
       </div>
    }>
      <HomeContent />
    </Suspense>
  );
}
