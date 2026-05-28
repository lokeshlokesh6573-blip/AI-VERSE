'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import audio from '@/utils/AudioEngine';

interface SpiderMascotProps {
  isThinking: boolean;
  isTalking: boolean;
  isListening?: boolean;
}

export default function SpiderMascot({ isThinking, isTalking, isListening = false }: SpiderMascotProps) {
  const [headRotation, setHeadRotation] = useState({ x: 0, y: 0 });
  const [isBlinking, setIsBlinking] = useState(false);
  const [activeWeb, setActiveWeb] = useState<{ startX: number; startY: number; targetX: number; targetY: number; progress: number } | null>(null);
  const mascotRef = useRef<HTMLDivElement>(null);
  const webCanvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameId = useRef<number | null>(null);

  // Mouse coordinate tracker for look-at-cursor effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!mascotRef.current) return;
      const rect = mascotRef.current.getBoundingClientRect();
      const mascotCenterX = rect.left + rect.width / 2;
      const mascotCenterY = rect.top + rect.height / 2;

      // Calculate vector from mascot center to cursor
      const dx = e.clientX - mascotCenterX;
      const dy = e.clientY - mascotCenterY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 400) {
        // Max tilt of 12 degrees
        const tiltX = (dy / dist) * 12;
        const tiltY = (dx / dist) * 12;
        setHeadRotation({ x: -tiltX, y: tiltY });
      } else {
        setHeadRotation({ x: 0, y: 0 });
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Blinking cycle generator (random blink every 3 to 6 seconds)
  useEffect(() => {
    let timer: NodeJS.Timeout;
    const blinkRoutine = () => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 150);
      
      const nextInterval = Math.random() * 3000 + 3000;
      timer = setTimeout(blinkRoutine, nextInterval);
    };

    timer = setTimeout(blinkRoutine, 4000);
    return () => clearTimeout(timer);
  }, []);

  // Render interactive shot web ropes on screen
  useEffect(() => {
    if (!activeWeb) return;
    const canvas = webCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let startTime = performance.now();
    const duration = 280; // milliseconds web is visible

    const drawWeb = (now: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1.0);

      // Interpolate web tip target
      const currX = activeWeb.startX + (activeWeb.targetX - activeWeb.startX) * Math.min(progress * 1.5, 1.0);
      const currY = activeWeb.startY + (activeWeb.targetY - activeWeb.startY) * Math.min(progress * 1.5, 1.0);

      // Web vibration offsets
      const waveFreq = 22;
      const amplitude = (1.0 - progress) * 15 * Math.sin(progress * Math.PI * 4);

      ctx.save();
      ctx.strokeStyle = '#ffffff';
      ctx.shadowBlur = 10;
      ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = (1.0 - progress) * 3 + 0.5;

      // Draw web string with sine wave vibration for elasticity
      ctx.beginPath();
      ctx.moveTo(activeWeb.startX, activeWeb.startY);
      
      const segments = 25;
      for (let i = 1; i <= segments; i++) {
        const segProgress = i / segments;
        const x = activeWeb.startX + (currX - activeWeb.startX) * segProgress;
        const y = activeWeb.startY + (currY - activeWeb.startY) * segProgress;

        // Apply perpendicular displacement for vibration
        const perpX = -(currY - activeWeb.startY);
        const perpY = currX - activeWeb.startX;
        const perpLength = Math.sqrt(perpX * perpX + perpY * perpY);
        
        let dx = 0;
        let dy = 0;
        if (perpLength > 0 && i < segments) {
          const factor = Math.sin(segProgress * Math.PI) * amplitude * Math.sin(segProgress * waveFreq);
          dx = (perpX / perpLength) * factor;
          dy = (perpY / perpLength) * factor;
        }

        ctx.lineTo(x + dx, y + dy);
      }
      ctx.stroke();

      // Spider web side threads (splatters) at impact target
      if (progress > 0.4) {
        const rad = (progress - 0.4) * 30;
        ctx.strokeStyle = `rgba(255, 255, 255, ${1.0 - progress})`;
        ctx.lineWidth = 1;
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
          ctx.beginPath();
          ctx.moveTo(activeWeb.targetX, activeWeb.targetY);
          ctx.lineTo(activeWeb.targetX + Math.cos(a) * rad, activeWeb.targetY + Math.sin(a) * rad);
          ctx.stroke();
        }
      }

      ctx.restore();

      if (progress < 1.0) {
        animationFrameId.current = requestAnimationFrame(drawWeb);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setActiveWeb(null);
      }
    };

    animationFrameId.current = requestAnimationFrame(drawWeb);
    return () => {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
  }, [activeWeb]);

  // Click handler to shoot web strings at mouse click coordinate
  const handleMascotClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    audio.playWebShoot();

    if (!mascotRef.current) return;
    const rect = mascotRef.current.getBoundingClientRect();
    const startX = rect.left + rect.width / 2;
    const startY = rect.top + rect.height / 2;

    // Shoot back at cursor
    setActiveWeb({
      startX,
      startY,
      targetX: e.clientX,
      targetY: e.clientY,
      progress: 0
    });
  };

  const getRingColor = () => {
    if (isListening) return 'border-green-500 shadow-green-500/50';
    if (isThinking) return 'border-blue-500 shadow-blue-500/50';
    if (isTalking) return 'border-amber-500 shadow-amber-500/50';
    return 'border-red-600/30 shadow-red-600/10';
  };

  const getAvatarGlow = () => {
    if (isListening) return 'bg-green-600/20';
    if (isThinking) return 'bg-blue-600/20 animate-pulse';
    if (isTalking) return 'bg-amber-600/25';
    return 'bg-red-950/20 group-hover:bg-red-600/10';
  };

  return (
    <>
      {/* Absolute fullscreen overlay canvas for drawing web strings */}
      <canvas ref={webCanvasRef} className="fixed inset-0 w-full h-full pointer-events-none z-50" />

      <div ref={mascotRef} className="fixed bottom-32 right-8 z-40">
        <motion.div
          onClick={handleMascotClick}
          onHoverStart={() => audio.playHover()}
          style={{
            transformStyle: 'preserve-3d',
            perspective: 600,
            rotateX: headRotation.x,
            rotateY: headRotation.y
          }}
          animate={{
            y: [0, -6, 0],
          }}
          transition={{
            y: { duration: 3.5, repeat: Infinity, ease: 'easeInOut' }
          }}
          className="relative group cursor-crosshair"
        >
          {/* Futuristic holographic HUD ring */}
          <div className={`absolute -inset-4 border rounded-full transition-all duration-500 shadow-lg ${getRingColor()} ${
            (isListening || isThinking || isTalking) ? 'animate-[spin_6s_linear_infinite]' : 'border-dashed scale-95'
          }`} />

          {/* Background Ambient Glow */}
          <div className={`absolute inset-0 rounded-full blur-xl transition-all duration-500 ${getAvatarGlow()}`} />

          {/* Glassmorphic Suit Container */}
          <div className="relative bg-black/60 border border-white/10 p-3 rounded-2xl backdrop-blur-md shadow-2xl transition-all group-hover:border-red-500/40">
            {/* Minimalist Vector Spider-Man Head */}
            <svg viewBox="0 0 100 100" className="w-14 h-14 drop-shadow-[0_0_8px_rgba(230,36,41,0.5)]">
              {/* Suit Base Red Mask */}
              <path 
                d="M50 8 C25 8, 14 30, 14 55 C14 80, 32 92, 50 92 C68 92, 86 80, 86 55 C86 30, 75 8, 50 8 Z" 
                fill="#e62429" 
                stroke="#1a0405" 
                strokeWidth="1.5"
              />
              
              {/* Web patterns on head */}
              <path d="M50 8 L50 92 M14 55 L86 55 M24 28 L76 82 M76 28 L24 82" stroke="#120202" strokeWidth="1" opacity="0.4" />
              <path d="M50 25 Q35 32 18 36 M50 25 Q65 32 82 36 M50 42 Q30 48 15 55 M50 42 Q70 48 85 55 M50 62 Q30 68 16 75 M50 62 Q70 68 84 75" stroke="#120202" strokeWidth="1" fill="none" opacity="0.4" />

              {/* Spider Eyes */}
              {/* Left Eye */}
              <path 
                d="M20 48 C20 48, 25 36, 42 42 C45 43, 44 54, 40 60 C32 55, 24 53, 20 48 Z" 
                fill="#ffffff" 
                stroke="#120202" 
                strokeWidth="3.5" 
                style={{ transformOrigin: '32px 50px' }}
                className="transition-transform duration-100"
                transform={isBlinking ? 'scale(1, 0.1)' : isThinking ? 'scale(1, 0.85)' : 'scale(1, 1)'}
              />
              {/* Right Eye */}
              <path 
                d="M80 48 C80 48, 75 36, 58 42 C55 43, 56 54, 60 60 C68 55, 76 53, 80 48 Z" 
                fill="#ffffff" 
                stroke="#120202" 
                strokeWidth="3.5"
                style={{ transformOrigin: '68px 50px' }}
                className="transition-transform duration-100"
                transform={isBlinking ? 'scale(1, 0.1)' : isThinking ? 'scale(1, 0.85)' : 'scale(1, 1)'}
              />
            </svg>

            {/* Small UI state tags */}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-black/80 px-2 py-0.5 rounded border border-white/10 text-[7px] text-white/50 tracking-widest font-black uppercase whitespace-nowrap">
              {isListening ? (
                <span className="text-green-400 animate-pulse">LISTENING</span>
              ) : isThinking ? (
                <span className="text-blue-400">THINKING</span>
              ) : isTalking ? (
                <span className="text-amber-500">TALKING</span>
              ) : (
                <span>SPIDEY_AI</span>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
}
