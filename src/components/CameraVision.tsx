'use client';

import React, { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Camera, X, Focus, RefreshCcw } from 'lucide-react';
import Tesseract from 'tesseract.js';

interface CameraVisionProps {
  onClose: () => void;
  onCaptureImage: (base64Image: string) => void;
  onOCRResult: (text: string) => void;
}

export default function CameraVision({ onClose, onCaptureImage, onOCRResult }: CameraVisionProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [facingMode]);

  const startCamera = async () => {
    stopCamera();
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facingMode }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      // Fallback to user camera if environment fails (e.g. laptop)
      if (facingMode === 'environment') {
        setFacingMode('user');
      }
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const captureFrame = (): string | null => {
    if (!videoRef.current || !canvasRef.current) return null;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.8);
  };

  const handleTakePhoto = () => {
    const imgData = captureFrame();
    if (imgData) {
      onCaptureImage(imgData);
      onClose();
    }
  };

  const handleOCR = async () => {
    if (isProcessing) return;
    const imgData = captureFrame();
    if (!imgData) return;

    setIsProcessing(true);
    try {
      const result = await Tesseract.recognize(imgData, 'eng', {
        logger: m => console.log(m)
      });
      onOCRResult(result.data.text);
      onClose();
    } catch (error) {
      console.error("OCR Error:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/90 backdrop-blur-xl"
    >
      <div className="absolute top-8 w-full px-8 flex justify-between items-center z-10">
         <div className="flex flex-col">
            <span className="text-red-500 text-[10px] uppercase tracking-[0.3em] font-black animate-pulse">Vision Subsystem</span>
            <span className="text-white/50 text-xs tracking-widest font-mono">Live Targeting...</span>
         </div>
         <button onClick={onClose} className="p-3 bg-white/5 rounded-full hover:bg-red-500/20 text-white/50 hover:text-red-400 transition-colors">
            <X className="w-6 h-6" />
         </button>
      </div>

      <div className="relative w-full max-w-2xl aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl shadow-blue-500/20 border border-white/10 group">
        <video 
           ref={videoRef} 
           autoPlay 
           playsInline 
           className="w-full h-full object-cover" 
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* HUD Targeting Reticle */}
        <div className="absolute inset-0 pointer-events-none opacity-50">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border border-red-500 rounded-full" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 border-t-2 border-l-2 border-red-500" />
          <div className="absolute top-1/2 left-1/2 -translate-x-[calc(50%-48px)] -translate-y-[calc(50%-48px)] w-4 h-4 border-b-2 border-r-2 border-red-500" />
          
          <div className="absolute top-4 left-4 w-12 h-12 border-t-2 border-l-2 border-blue-500" />
          <div className="absolute top-4 right-4 w-12 h-12 border-t-2 border-r-2 border-blue-500" />
          <div className="absolute bottom-4 left-4 w-12 h-12 border-b-2 border-l-2 border-blue-500" />
          <div className="absolute bottom-4 right-4 w-12 h-12 border-b-2 border-r-2 border-blue-500" />
        </div>

        {isProcessing && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="text-blue-400 font-mono text-sm tracking-widest flex items-center gap-4">
              <Focus className="w-6 h-6 animate-[spin_3s_linear_infinite]" />
              EXTRACTING TEXT DATA...
            </div>
          </div>
        )}
      </div>

      <div className="absolute bottom-12 flex space-x-6 z-10 w-full justify-center px-4">
         <button onClick={toggleCamera} className="p-4 bg-white/5 hover:bg-white/10 rounded-full transition-all text-white backdrop-blur-md">
            <RefreshCcw className="w-6 h-6" />
         </button>
         
         <button onClick={handleTakePhoto} disabled={isProcessing} className="px-8 py-4 bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/50 rounded-full transition-all text-white backdrop-blur-md flex items-center gap-3 active:scale-95 disabled:opacity-50">
            <Camera className="w-5 h-5" />
            <span className="text-xs uppercase tracking-widest font-black">Capture</span>
         </button>
         
         <button onClick={handleOCR} disabled={isProcessing} className="px-8 py-4 bg-red-600/30 hover:bg-red-600/50 border border-red-500/50 rounded-full transition-all text-red-100 backdrop-blur-md flex items-center gap-3 active:scale-95 disabled:opacity-50">
            <Focus className="w-5 h-5" />
            <span className="text-xs uppercase tracking-widest font-black">OCR Scan</span>
         </button>
      </div>
    </motion.div>
  );
}
