'use client';

import React, { useEffect, useRef } from 'react';
import audio from '@/utils/AudioEngine';

interface RooftopBackgroundProps {
  performanceMode?: 'low' | 'high';
}

export default function RooftopBackground({ performanceMode = 'high' }: RooftopBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameId = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Settings based on screen size and performance options
    const isMobile = width < 768;
    const isLowPower = performanceMode === 'low' || isMobile;

    // Rain particles
    const rainCount = isLowPower ? 25 : 75;
    const rain: { x: number; y: number; len: number; speed: number }[] = [];
    for (let i = 0; i < rainCount; i++) {
      rain.push({
        x: Math.random() * width,
        y: Math.random() * height,
        len: Math.random() * 15 + 15,
        speed: Math.random() * 12 + 10
      });
    }

    // Fog clouds
    const fogCount = isLowPower ? 4 : 10;
    const fog: { x: number; y: number; r: number; vx: number; opacity: number }[] = [];
    for (let i = 0; i < fogCount; i++) {
      fog.push({
        x: Math.random() * width,
        y: Math.random() * height * 0.6 + height * 0.4,
        r: Math.random() * 80 + 80,
        vx: Math.random() * 0.3 - 0.15,
        opacity: Math.random() * 0.12 + 0.03
      });
    }

    // Skyline Building coordinates (procedural NYC)
    const buildings: { x: number; w: number; h: number; lightColor: string }[] = [];
    const bCount = isMobile ? 8 : 15;
    const bWidth = width / bCount;
    for (let i = 0; i < bCount; i++) {
      buildings.push({
        x: i * bWidth,
        w: bWidth + 2,
        h: (Math.sin(i * 1.8) * 110 + 220) * (height / 800),
        lightColor: Math.random() > 0.65 ? 'rgba(230, 36, 41, 0.08)' : 'rgba(96, 165, 250, 0.05)' // red neon or blue highlights
      });
    }

    // Lightning flashes
    let lightningActive = false;
    let lightningTime = 0;

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const loop = (timestamp: number) => {
      // 1. Procedural Lightning (Visually only, sound removed to prevent glitches)
      if (Math.random() < 0.0015 && !lightningActive && !isLowPower) {
        lightningActive = true;
        lightningTime = timestamp;
      }
      if (lightningActive && timestamp - lightningTime > 250) {
        lightningActive = false;
      }

      // 2. Clear Screen
      ctx.fillStyle = lightningActive && Math.random() > 0.4 ? '#16080b' : '#030102';
      ctx.fillRect(0, 0, width, height);

      // 3. Draw Procedural Skyline
      ctx.fillStyle = '#060304';
      buildings.forEach(b => {
        ctx.fillRect(b.x, height - b.h, b.w, b.h);

        // Neon red/blue antennas on top of some tall buildings
        if (b.h > 180 && !isLowPower) {
          ctx.strokeStyle = Math.random() > 0.5 ? '#e62429' : '#3b82f6';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(b.x + b.w / 2, height - b.h);
          ctx.lineTo(b.x + b.w / 2, height - b.h - 30);
          ctx.stroke();

          // Pulsing red glowing dot on top
          ctx.fillStyle = Math.random() > 0.85 ? '#ffffff' : (Math.random() > 0.5 ? '#e62429' : '#3b82f6');
          ctx.beginPath();
          ctx.arc(b.x + b.w / 2, height - b.h - 30, 2, 0, Math.PI * 2);
          ctx.fill();
        }

        // Draw glowing interior windows
        ctx.fillStyle = b.lightColor;
        const startY = height - b.h + 30;
        const stepY = isMobile ? 40 : 25;
        const stepX = isMobile ? 25 : 15;
        for (let wy = startY; wy < height - 10; wy += stepY) {
          for (let wx = b.x + 10; wx < b.x + b.w - 10; wx += stepX) {
            if (Math.sin(wx * 2 + wy * 3) > 0.25) {
              ctx.fillRect(wx, wy, 2.5, 5);
            }
          }
        }
        ctx.fillStyle = '#060304';
      });

      // 4. Draw Atmospheric Fog
      fog.forEach(cloud => {
        cloud.x += cloud.vx;
        if (cloud.x - cloud.r > width) cloud.x = -cloud.r;
        if (cloud.x + cloud.r < 0) cloud.x = width + cloud.r;

        const radGrad = ctx.createRadialGradient(cloud.x, cloud.y, 0, cloud.x, cloud.y, cloud.r);
        radGrad.addColorStop(0, `rgba(230, 36, 41, ${cloud.opacity * 0.55})`); // Crimson center
        radGrad.addColorStop(0.5, `rgba(15, 10, 20, ${cloud.opacity * 0.2})`);
        radGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = radGrad;
        ctx.beginPath();
        ctx.arc(cloud.x, cloud.y, cloud.r, 0, Math.PI * 2);
        ctx.fill();
      });

      // 5. Draw Rain Drops
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      rain.forEach(drop => {
        ctx.beginPath();
        ctx.moveTo(drop.x, drop.y);
        ctx.lineTo(drop.x - 1.5, drop.y + drop.len);
        ctx.stroke();

        drop.y += drop.speed;
        drop.x -= 0.3;
        if (drop.y > height) {
          drop.y = -drop.len;
          drop.x = Math.random() * width;
        }
      });

      animationFrameId.current = requestAnimationFrame(loop);
    };

    animationFrameId.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [performanceMode]);

  return <canvas ref={canvasRef} className="fixed inset-0 w-full h-full block z-0 pointer-events-none opacity-40" />;
}
