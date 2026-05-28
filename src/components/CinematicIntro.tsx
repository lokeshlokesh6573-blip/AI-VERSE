'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import audio from '@/utils/AudioEngine';

interface CinematicIntroProps {
  onComplete: () => void;
}

export default function CinematicIntro({ onComplete }: CinematicIntroProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<'intro' | 'swing' | 'landing' | 'stand' | 'ready'>('intro');
  const [showSkip, setShowSkip] = useState(false);
  const animationFrameId = useRef<number | null>(null);

  // Sound triggers
  const speechTriggered = useRef(false);

  // Spidey state
  const spidey = useRef({
    x: -200,
    y: -200,
    vx: 18,
    vy: 12,
    angle: -Math.PI / 4,
    angularVelocity: 0.05,
    ropeLength: 0,
    attached: true,
    scale: 0.6,
    rotation: -45,
    opacity: 1
  });

  // Shockwave & particles
  const shockwaves = useRef<{ x: number; y: number; r: number; maxR: number; opacity: number }[]>([]);
  const particles = useRef<{ x: number; y: number; vx: number; vy: number; r: number; color: string; decay: number; opacity: number }[]>([]);
  const webCracks = useRef<{ x1: number; y1: number; x2: number; y2: number; opacity: number }[]>([]);
  const rain = useRef<{ x: number; y: number; length: number; speed: number }[]>([]);
  const fog = useRef<{ x: number; y: number; r: number; vx: number; opacity: number }[]>([]);
  const lightningTime = useRef(0);
  const lightningActive = useRef(false);
  const shakeIntensity = useRef(0);

  // Initialize particles
  const initWeather = (width: number, height: number) => {
    rain.current = [];
    for (let i = 0; i < 80; i++) {
      rain.current.push({
        x: Math.random() * width,
        y: Math.random() * height,
        length: Math.random() * 20 + 20,
        speed: Math.random() * 15 + 15
      });
    }

    fog.current = [];
    for (let i = 0; i < 15; i++) {
      fog.current.push({
        x: Math.random() * width,
        y: Math.random() * height * 0.7 + height * 0.3,
        r: Math.random() * 100 + 100,
        vx: Math.random() * 0.5 - 0.25,
        opacity: Math.random() * 0.15 + 0.05
      });
    }
  };

  useEffect(() => {
    // Show skip button after a short delay
    const skipTimer = setTimeout(() => setShowSkip(true), 1500);

    // Play background ambient drone
    audio.startAmbientHum();

    return () => {
      clearTimeout(skipTimer);
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    initWeather(width, height);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      initWeather(width, height);
    };
    window.addEventListener('resize', handleResize);

    // Initialize Spider-Man pendulum coordinates
    const pivotX = width / 2;
    const pivotY = -50;
    spidey.current.ropeLength = height * 0.8;
    spidey.current.x = pivotX - spidey.current.ropeLength * Math.sin(Math.PI / 3);
    spidey.current.y = pivotY + spidey.current.ropeLength * Math.cos(Math.PI / 3);

    // Web crack branch generator
    const generateWebCracks = (cx: number, cy: number) => {
      const cracks: { x1: number; y1: number; x2: number; y2: number; opacity: number }[] = [];
      const numBranches = 16;
      for (let i = 0; i < numBranches; i++) {
        const baseAngle = (i / numBranches) * Math.PI * 2 + (Math.random() * 0.2 - 0.1);
        let currX = cx;
        let currY = cy;
        let segmentLen = Math.random() * 40 + 30;
        
        // Build 3 nested segments per radial branch (spider web crack style)
        for (let j = 0; j < 3; j++) {
          const angle = baseAngle + (Math.random() * 0.4 - 0.2);
          const nextX = currX + Math.cos(angle) * segmentLen;
          const nextY = currY + Math.sin(angle) * segmentLen;
          cracks.push({ x1: currX, y1: currY, x2: nextX, y2: nextY, opacity: 1.0 });
          
          // Concentric circular threads
          if (j > 0 && Math.random() > 0.3) {
            const nextAngle = ((i + 1) / numBranches) * Math.PI * 2;
            const nextRadX = cx + Math.cos(nextAngle) * (segmentLen * (j + 0.5));
            const nextRadY = cy + Math.sin(nextAngle) * (segmentLen * (j + 0.5));
            cracks.push({ x1: nextX, y1: nextY, x2: nextRadX, y2: nextRadY, opacity: 0.6 });
          }

          currX = nextX;
          currY = nextY;
          segmentLen *= 0.7; // Shrink segments outward
        }
      }
      return cracks;
    };

    // Render loop
    let lastTime = 0;
    const loop = (timestamp: number) => {
      if (!lastTime) lastTime = timestamp;
      const dt = (timestamp - lastTime) / 1000;
      lastTime = timestamp;

      // Handle lightning
      if (Math.random() < 0.005 && !lightningActive.current && phase !== 'intro') {
        lightningActive.current = true;
        lightningTime.current = timestamp;
        audio.playThunder();
      }
      if (lightningActive.current && timestamp - lightningTime.current > 300) {
        lightningActive.current = false;
      }

      // Update Screen Shake
      if (shakeIntensity.current > 0.1) {
        shakeIntensity.current *= 0.9; // Decay
      } else {
        shakeIntensity.current = 0;
      }

      ctx.save();
      if (shakeIntensity.current > 0) {
        const shakeX = (Math.random() - 0.5) * shakeIntensity.current;
        const shakeY = (Math.random() - 0.5) * shakeIntensity.current;
        ctx.translate(shakeX, shakeY);
      }

      // Background clearing
      ctx.fillStyle = lightningActive.current && Math.random() > 0.3 ? '#2a0a0f' : '#030102';
      ctx.fillRect(0, 0, width, height);

      // Render Skyline silhouettes (procedural NYC)
      ctx.fillStyle = '#0a0507';
      const bCount = 12;
      const bWidth = width / bCount;
      for (let i = 0; i < bCount; i++) {
        const bHeight = (Math.sin(i * 1.5) * 100 + 200) * (height / 800);
        ctx.fillRect(i * bWidth, height - bHeight, bWidth + 2, bHeight);

        // Procedural Windows
        ctx.fillStyle = 'rgba(255, 0, 0, 0.08)';
        for (let wy = height - bHeight + 20; wy < height - 20; wy += 30) {
          for (let wx = i * bWidth + 10; wx < (i + 1) * bWidth - 10; wx += 15) {
            if (Math.sin(wx + wy) > 0.2) {
              ctx.fillRect(wx, wy, 4, 8);
            }
          }
        }
        ctx.fillStyle = '#0a0507';
      }

      // Draw Atmospheric Fog
      fog.current.forEach(cloud => {
        cloud.x += cloud.vx;
        if (cloud.x - cloud.r > width) cloud.x = -cloud.r;
        if (cloud.x + cloud.r < 0) cloud.x = width + cloud.r;

        const radGrad = ctx.createRadialGradient(cloud.x, cloud.y, 0, cloud.x, cloud.y, cloud.r);
        radGrad.addColorStop(0, `rgba(230, 36, 41, ${cloud.opacity * 0.4})`);
        radGrad.addColorStop(0.5, `rgba(20, 10, 15, ${cloud.opacity * 0.15})`);
        radGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = radGrad;
        ctx.beginPath();
        ctx.arc(cloud.x, cloud.y, cloud.r, 0, Math.PI * 2);
        ctx.fill();
      });

      // Update and Draw Rain
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 1;
      rain.current.forEach(drop => {
        ctx.beginPath();
        ctx.moveTo(drop.x, drop.y);
        ctx.lineTo(drop.x - 2, drop.y + drop.length);
        ctx.stroke();

        drop.y += drop.speed;
        drop.x -= 0.5;
        if (drop.y > height) {
          drop.y = -drop.length;
          drop.x = Math.random() * width;
        }
      });

      // Render Web cracks (Spider-Man landing impact)
      if (webCracks.current.length > 0) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.shadowBlur = 10;
        ctx.shadowColor = 'rgba(255, 0, 0, 0.6)';
        webCracks.current.forEach(crack => {
          ctx.lineWidth = crack.opacity * 1.5;
          ctx.strokeStyle = `rgba(255, 255, 255, ${crack.opacity * 0.6})`;
          ctx.beginPath();
          ctx.moveTo(crack.x1, crack.y1);
          ctx.lineTo(crack.x2, crack.y2);
          ctx.stroke();
          
          if (phase === 'ready') {
            crack.opacity *= 0.985; // Slow fadeout
          }
        });
        ctx.shadowBlur = 0;
      }

      // Update Shockwaves
      shockwaves.current.forEach((sw, idx) => {
        sw.r += dt * 600;
        sw.opacity = 1 - (sw.r / sw.maxR);
        if (sw.opacity < 0) sw.opacity = 0;

        ctx.strokeStyle = `rgba(230, 36, 41, ${sw.opacity * 0.8})`;
        ctx.lineWidth = 4;
        ctx.shadowBlur = 15;
        ctx.shadowColor = 'rgba(230, 36, 41, 0.8)';
        ctx.beginPath();
        ctx.ellipse(sw.x, sw.y, sw.r, sw.r * 0.4, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
      });
      shockwaves.current = shockwaves.current.filter(sw => sw.opacity > 0);

      // Update and Draw Particles
      particles.current.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += dt * 300; // gravity
        p.opacity -= dt * p.decay;
        if (p.opacity < 0) p.opacity = 0;

        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.opacity;
        ctx.shadowBlur = 6;
        ctx.shadowColor = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1.0;
      ctx.shadowBlur = 0;
      particles.current = particles.current.filter(p => p.opacity > 0);

      // Physics/Logic based on Cinematic Phase
      const s = spidey.current;

      if (phase === 'intro') {
        // Just rain showing, then spider web shoots down
        if (timestamp > 1200) {
          audio.playWebShoot();
          setPhase('swing');
        }
      } 
      else if (phase === 'swing') {
        // Pendulum simulation
        s.angle += s.angularVelocity;
        
        // Damping / acceleration
        const gravityEffect = -0.04 * Math.sin(s.angle);
        s.angularVelocity += gravityEffect;
        s.angularVelocity *= 0.99; // Drag

        s.x = pivotX + s.ropeLength * Math.sin(s.angle);
        s.y = pivotY + s.ropeLength * Math.cos(s.angle);
        s.rotation = s.angle * (180 / Math.PI);

        // Motion Blur swing rope
        ctx.strokeStyle = 'rgba(255,255,255,0.7)';
        ctx.lineWidth = 2.5;
        ctx.shadowBlur = 8;
        ctx.shadowColor = 'rgba(255,255,255,0.5)';
        ctx.beginPath();
        ctx.moveTo(pivotX, pivotY);
        ctx.lineTo(s.x, s.y);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Release near bottom point to swing into land parabolic arc
        if (s.angle > 0.05 && s.attached) {
          s.attached = false;
          s.vx = s.angularVelocity * s.ropeLength * Math.cos(s.angle);
          s.vy = -s.angularVelocity * s.ropeLength * Math.sin(s.angle);
          setPhase('landing');
        }
      } 
      else if (phase === 'landing') {
        // Free fall parabolic motion
        s.x += s.vx * dt * 70;
        s.y += s.vy * dt * 70;
        s.vy += dt * 65; // gravity pulls spidey down

        // Dynamic spin animation in air
        s.rotation += dt * 450;

        const targetX = width / 2;
        const targetY = height * 0.72;

        // Land detection
        if (s.y >= targetY) {
          s.x = targetX;
          s.y = targetY;
          s.vx = 0;
          s.vy = 0;
          s.rotation = 0;
          
          // Landing impact
          setPhase('stand');
          shakeIntensity.current = 28;
          audio.playLandingRumble();
          
          // Generate cracks
          webCracks.current = generateWebCracks(targetX, targetY);

          // Spawn landing shockwave
          shockwaves.current.push({
            x: targetX,
            y: targetY,
            r: 10,
            maxR: width * 0.45,
            opacity: 1
          });

          // Spawn red glowing sparks particles
          for (let i = 0; i < 60; i++) {
            const angle = Math.random() * Math.PI * 2;
            const spd = Math.random() * 8 + 3;
            particles.current.push({
              x: targetX,
              y: targetY,
              vx: Math.cos(angle) * spd,
              vy: Math.sin(angle) * spd - (Math.random() * 4), // upwards bias
              r: Math.random() * 3 + 2,
              color: Math.random() > 0.3 ? '#e62429' : '#ffffff',
              decay: Math.random() * 0.6 + 0.4,
              opacity: 1.0
            });
          }
        }
      } 
      else if (phase === 'stand' || phase === 'ready') {
        // Stay in center landing spot
        s.x = width / 2;
        s.y = height * 0.72;
        s.rotation = 0;

        // Trigger synthesized speech after impact
        if (phase === 'stand' && !speechTriggered.current) {
          speechTriggered.current = true;
          setTimeout(() => {
            if (window.speechSynthesis) {
              const voiceEngine = window.speechSynthesis;
              voiceEngine.cancel();
              const utterance = new SpeechSynthesisUtterance("Hey buddy... how can I help you?");
              utterance.pitch = 1.05;
              utterance.rate = 0.95;
              utterance.volume = 1.0;
              const voices = voiceEngine.getVoices();
              const prefer = voices.find(v => v.name.toLowerCase().includes('google us english') || v.name.toLowerCase().includes('male'));
              if (prefer) utterance.voice = prefer;
              voiceEngine.speak(utterance);
            }
            setPhase('ready');
            
            // Advance to dashboard after 2.5 seconds
            setTimeout(() => {
              onComplete();
            }, 2600);
          }, 600);
        }
      }

      // Draw stylized Spider-Man Vector Character
      if (phase !== 'intro') {
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate((s.rotation * Math.PI) / 180);
        ctx.scale(s.scale, s.scale);

        // Core spider glow
        ctx.shadowBlur = 25;
        ctx.shadowColor = 'rgba(230, 36, 41, 0.9)';

        if (phase === 'swing' || phase === 'landing') {
          // Dynamic swing silhouette
          ctx.fillStyle = '#e62429';
          ctx.beginPath();
          // Head
          ctx.arc(0, -60, 24, 0, Math.PI * 2);
          ctx.fill();

          // Body & limbs in swinging pose
          ctx.fillStyle = '#111526'; // dark spider suit details
          ctx.fillRect(-15, -36, 30, 50);

          ctx.fillStyle = '#e62429';
          // Arm 1 holding web
          ctx.lineWidth = 8;
          ctx.strokeStyle = '#e62429';
          ctx.beginPath();
          ctx.moveTo(-10, -25);
          ctx.lineTo(-30, -70);
          ctx.stroke();

          // Arm 2 free
          ctx.beginPath();
          ctx.moveTo(10, -25);
          ctx.lineTo(35, -10);
          ctx.stroke();

          // Legs bent in air
          ctx.beginPath();
          ctx.moveTo(-10, 14);
          ctx.lineTo(-25, 45);
          ctx.lineTo(-10, 65);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(10, 14);
          ctx.lineTo(25, 35);
          ctx.lineTo(15, 60);
          ctx.stroke();

          // Glowing white eye slits
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.moveTo(-16, -62);
          ctx.quadraticCurveTo(-10, -66, -4, -60);
          ctx.quadraticCurveTo(-10, -52, -16, -62);
          ctx.fill();

          ctx.beginPath();
          ctx.moveTo(16, -62);
          ctx.quadraticCurveTo(10, -66, 4, -60);
          ctx.quadraticCurveTo(10, -52, 16, -62);
          ctx.fill();
        } 
        else if (phase === 'stand' || phase === 'ready') {
          // Classic Crouched Landing Pose (3-point landing: hand and legs on floor)
          ctx.fillStyle = '#e62429';
          ctx.strokeStyle = '#050304';
          ctx.lineWidth = 3;

          // Drawing Crouched Spidey body outline
          ctx.beginPath();
          // Head (tilted forward)
          ctx.arc(0, -65, 22, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Crouched Back / Torso
          ctx.fillStyle = '#0e080b'; // dark blue/black suit highlights
          ctx.beginPath();
          ctx.moveTo(-20, -45);
          ctx.quadraticCurveTo(-45, -20, -35, 10);
          ctx.lineTo(15, 10);
          ctx.quadraticCurveTo(20, -30, -20, -45);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#e62429';
          // Right arm supporting on ground (x=25, y=30)
          ctx.beginPath();
          ctx.moveTo(-10, -30);
          ctx.lineTo(25, -5);
          ctx.lineTo(25, 30); // touching floor relative to torso
          ctx.stroke();

          // Left arm bent back
          ctx.beginPath();
          ctx.moveTo(-25, -30);
          ctx.lineTo(-45, -45);
          ctx.lineTo(-30, -10);
          ctx.stroke();

          // Left Leg (wide bent)
          ctx.beginPath();
          ctx.moveTo(-25, 5);
          ctx.lineTo(-65, 20);
          ctx.lineTo(-50, 30);
          ctx.stroke();

          // Right Leg (crouched tight)
          ctx.beginPath();
          ctx.moveTo(10, 5);
          ctx.lineTo(5, 25);
          ctx.lineTo(-10, 30);
          ctx.stroke();

          // Spider Emblem on back
          ctx.fillStyle = '#000000';
          ctx.beginPath();
          ctx.arc(-15, -22, 4, 0, Math.PI * 2);
          ctx.fill();
          // legs
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = '#000000';
          for (let i = 0; i < 4; i++) {
            ctx.beginPath();
            ctx.moveTo(-15, -22);
            ctx.quadraticCurveTo(-25 - (i*2), -30 + (i*6), -30 - (i*2), -22 + (i*4));
            ctx.stroke();
          }

          // Large angled White Eyes (looking down / forward)
          ctx.fillStyle = '#ffffff';
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 3;

          ctx.beginPath();
          ctx.moveTo(-15, -69);
          ctx.quadraticCurveTo(-8, -75, -2, -68);
          ctx.quadraticCurveTo(-6, -58, -15, -69);
          ctx.fill();
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(15, -69);
          ctx.quadraticCurveTo(8, -75, 2, -68);
          ctx.quadraticCurveTo(6, -58, 15, -69);
          ctx.fill();
          ctx.stroke();
        }

        ctx.restore();
      }

      ctx.restore();
      animationFrameId.current = requestAnimationFrame(loop);
    };

    animationFrameId.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [phase, onComplete]);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center bg-black">
      <canvas ref={canvasRef} className="fixed inset-0 w-full h-full block" />

      {/* Futuristic HUD overlay during intro */}
      <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-8">
        <div className="flex justify-between items-start">
          <div className="flex flex-col space-y-1">
             <span className="text-[10px] text-red-500 font-black tracking-[0.3em] uppercase animate-pulse">SYSTEM BOOT INITIATED</span>
             <span className="text-[9px] text-white/40 font-mono tracking-widest">LOC_NY_ROOFTOP_SECTOR_5</span>
          </div>
          <span className="text-[10px] text-blue-400 font-mono font-bold uppercase tracking-widest">
            OS: AI_VERSE_ALPHA_3.12
          </span>
        </div>

        {/* Cinematic Title Cards */}
        <AnimatePresence>
          {phase === 'ready' && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="self-center flex flex-col items-center space-y-2 pointer-events-auto"
            >
              <h1 className="text-4xl md:text-5xl font-black text-white italic tracking-wider uppercase select-none drop-shadow-[0_0_20px_rgba(230,36,41,0.6)]">
                AI <span className="text-red-600">VERSE</span>
              </h1>
              <p className="text-xs md:text-sm font-semibold tracking-[0.4em] text-blue-400 uppercase text-center max-w-md bg-black/40 px-4 py-2 rounded border border-white/5 backdrop-blur-sm shadow-xl">
                “Hey buddy... how can I help you?”
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex justify-between items-end">
          <div className="flex flex-col space-y-1">
            <span className="text-[8px] text-white/30 font-mono">CONNECTION: ENCRYPTED_SSL</span>
            <span className="text-[8px] text-white/30 font-mono">NEURAL_GRID_LOAD: OPTIMAL</span>
          </div>
          
          {showSkip && (
            <button
              onClick={() => {
                audio.playSelect();
                onComplete();
              }}
              className="pointer-events-auto px-4 py-2 border border-red-600/30 bg-red-950/20 text-red-500 hover:text-white hover:bg-red-600/30 rounded-lg text-xs font-black tracking-widest uppercase transition-all duration-300 backdrop-blur-md cursor-pointer hover:shadow-[0_0_15px_rgba(230,36,41,0.4)] active:scale-95"
            >
              Skip Intro
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
