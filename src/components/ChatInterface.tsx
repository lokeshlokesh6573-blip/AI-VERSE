'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Mic, Cpu, Shield, Sparkles, Paperclip, Download, FileText, Volume2, Camera, RefreshCcw } from 'lucide-react';
import { VoiceAssistant, getVoiceAssistant } from '@/lib/voice-assistant';
import dynamic from 'next/dynamic';
import { SquareSquare } from 'lucide-react'; // For formatting Stop icon
import CameraVision from './CameraVision';

const DynamicLiveCodeBlock = dynamic(() => import('./LiveCodeBlock'), { ssr: false });
const DynamicCSVAnalyzer = dynamic(() => import('./CSVAnalyzer'), { ssr: false });


interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

interface ChatInterfaceProps {
  onLoadingChange?: (loading: boolean) => void;
  onTalkingChange?: (talking: boolean) => void;
  onListeningChange?: (listening: boolean) => void;
}

export default function ChatInterface({ onLoadingChange, onTalkingChange, onListeningChange }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', text: "Systems online. How can I assist you today?", sender: 'ai', timestamp: new Date() }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [fileContext, setFileContext] = useState<{ type: 'text' | 'image', data: string, name: string } | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [offlineMode, setOfflineMode] = useState<'cloud' | 'ollama' | 'utilities'>('cloud');
  const [showCamera, setShowCamera] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lastAIResponseId, setLastAIResponseId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const voiceRef = useRef<VoiceAssistant | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    setOfflineMode(navigator.onLine ? 'cloud' : 'ollama');
    const handleOnline = () => { setIsOnline(true); setOfflineMode('cloud'); };
    const handleOffline = () => { setIsOnline(false); setOfflineMode('ollama'); };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    }
  }, []);

  useEffect(() => {
    voiceRef.current = getVoiceAssistant();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (overrideText?: string) => {
    const text = overrideText || input;
    if (!text.trim() || isLoading) return;

    // Interrupt any current speech
    voiceRef.current?.stopSpeaking();
    setIsSpeaking(false);
    onTalkingChange?.(false);

    if (offlineMode === 'utilities') {
      const warning: Message = { id: Date.now().toString(), text: "System is in Utilities Mode. Active AI Inference is disabled. You may continue to use OCR, File Viewing, and PDF Generation locally.", sender: 'ai', timestamp: new Date() };
      setMessages(prev => [...prev, { id: Date.now() + '_u', text, sender: 'user', timestamp: new Date() }, warning]);
      setInput('');
      return;
    }

    setIsLoading(true);
    onLoadingChange?.(true);
    const userMsg: Message = {
      id: Date.now().toString(),
      text: text,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');

    try {
      const currentFileContext = fileContext;
      if (currentFileContext) setFileContext(null); // consume once

      const payloadMessages: any[] = [...messages.map(m => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text }))];

      if (currentFileContext) {
        if (currentFileContext.type === 'text') {
          payloadMessages.push({ role: 'system', content: currentFileContext.data });
          payloadMessages.push({ role: 'user', content: text });
        } else {
          // Vision Model standard multimodal payload
          payloadMessages.push({
            role: 'user',
            content: [
              { type: 'text', text: `[Image context attached: ${currentFileContext.name}]\n` + text },
              { type: 'image_url', image_url: { url: currentFileContext.data } }
            ]
          });
        }
      } else {
        payloadMessages.push({ role: 'user', content: text });
      }

      let requestUrl = '/api/chat';
      let payloadBody: any = { messages: payloadMessages, hasImage: currentFileContext?.type === 'image' };
      let headers: any = { 'Content-Type': 'application/json' };

      if (!isOnline && offlineMode === 'ollama') {
        requestUrl = 'http://localhost:11434/v1/chat/completions';
        payloadBody = {
          model: 'llama3.2', // default local model
          messages: payloadMessages,
          stream: true
        };
      }

      const response = await fetch(requestUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payloadBody),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ message: 'API request failed' }));
        throw new Error(errData.message || 'API request failed');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let aiText = '';

      const aiMsgId = (Date.now() + 1).toString();
      setMessages(prev => [...prev, { id: aiMsgId, text: '', sender: 'ai', timestamp: new Date() }]);

      while (true) {
        const { done, value } = await reader!.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });

        // Handle Ollama SSE format vs default Next.js Text format
        if (!isOnline) {
          const lines = chunk.split('\n').filter(line => line.trim() !== '');
          for (const line of lines) {
            if (line === 'data: [DONE]') break;
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.choices[0].delta.content) {
                  aiText += data.choices[0].delta.content;
                }
              } catch (e) { }
            }
          }
        } else {
          aiText += chunk;
        }

        setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, text: aiText } : m));
      }

      setLastAIResponseId(aiMsgId);

      // Voice Output removed from automation. It is now explicitly triggered by user request.
    } catch (error) {
      console.error(error);

      let errorText = "Error connecting to Core Intelligence. Please check your network.";

      // If we were trying to hit Local Ollama and it failed, fallback to Utilities Mode
      if (!isOnline && offlineMode === 'ollama') {
        setOfflineMode('utilities');
        errorText = "Local Provider (Ollama) unreachable. Downgrading to Offline Utilities Mode. Active inference disabled. Modules available: CSV/PDF Parsers, OCR Camera, Offline Docs.";
      }

      const errorMsg: Message = {
        id: `error-${Date.now()}`,
        text: errorText,
        sender: 'ai',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
      onLoadingChange?.(false);
    }
  };

  const startVoice = () => {
    setIsListening(true);
    onListeningChange?.(true);
    voiceRef.current?.listen(
      (text) => {
        setIsListening(false);
        onListeningChange?.(false);
        handleSend(text);
      },
      (err) => {
        console.error(err);
        setIsListening(false);
        onListeningChange?.(false);
      }
    );
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsLoading(true);
      onLoadingChange?.(true);
      const isImage = file.type.startsWith('image/');

      if (isImage) {
        const { parseFileBase64 } = await import('@/lib/file-parser');
        const base64 = await parseFileBase64(file);
        setFileContext({ type: 'image', data: base64, name: file.name });
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          text: `Visually processed image ${file.name}. Ready to describe or use it.`,
          sender: 'ai',
          timestamp: new Date()
        }]);
      } else {
        const { parseFileText } = await import('@/lib/file-parser');
        const text = await parseFileText(file);

        if (file.name.toLowerCase().endsWith('.csv')) {
          setFileContext({ type: 'text', data: `[CONTENTS OF CSV FILE "${file.name}":\n${text}\n]`, name: file.name });
          setMessages(prev => [...prev, {
            id: Date.now().toString(),
            text: `Visualizing CSV dataset: ${file.name}\n[CSV_DATA]\n${text}\n[/CSV_DATA]`,
            sender: 'ai',
            timestamp: new Date()
          }]);
        } else {
          setFileContext({ type: 'text', data: `[CONTENTS OF UPLOADED FILE "${file.name}":\n${text}\n]`, name: file.name });
          setMessages(prev => [...prev, {
            id: Date.now().toString(),
            text: `Successfully analyzed ${file.name}. Ready for your queries.`,
            sender: 'ai',
            timestamp: new Date()
          }]);
        }
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        text: `Error analyzing file: ${err instanceof Error ? err.message : 'Unknown format'}.`,
        sender: 'ai',
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
      onLoadingChange?.(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const renderMessageContent = (text: string, msgId: string, sender: 'user' | 'ai') => {
    if (sender === 'user') return <p className="text-base leading-relaxed whitespace-pre-wrap wrap-break-word mb-4">{text}</p>;

    const pdfRegex = /\[REQUEST_PDF\]/g;
    let hasPdfButton = pdfRegex.test(text);
    let cleanText = text.replace(pdfRegex, '');

    // Split text into normal text, React Code blocks, Images, or CSVs
    const parts = cleanText.split(/(```(?:jsx|tsx|react)[\s\S]*?```|\[GENERATE_IMAGE:\s*.*?\]|\[CSV_DATA\][\s\S]*?\[\/CSV_DATA\])/g);

    let contentBlocks = parts.map((part, index) => {
      if (part.startsWith('```')) {
        const code = part.replace(/```(?:jsx|tsx|react)\n?/, '').replace(/```$/, '').trim();
        return <DynamicLiveCodeBlock key={`code-${index}`} code={code} />;
      }
      if (part.startsWith('[GENERATE_IMAGE:')) {
        const prompt = part.replace(/\[GENERATE_IMAGE:\s*/, '').replace(/\]$/, '').trim();
        const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=768&height=432&nologo=true`;
        return (
          <div key={`img-${index}`} className="w-full my-4 rounded-xl overflow-hidden shadow-2xl shadow-blue-500/20 border border-white/10 group-hover:border-blue-500/50 transition-colors">
            <img src={url} alt={prompt} className="w-full h-auto object-cover" />
            <p className="text-[10px] text-white/50 p-2 text-center uppercase tracking-widest bg-black/50 backdrop-blur-md">Visual Engine Generated</p>
          </div>
        );
      }
      if (part.startsWith('[CSV_DATA]')) {
        const csvContent = part.replace(/^\[CSV_DATA\]\n?/, '').replace(/\n?\[\/CSV_DATA\]$/, '');
        return <DynamicCSVAnalyzer key={`csv-${index}`} csvData={csvContent} />;
      }
      return part.trim() ? <p key={`txt-${index}`} className="text-base leading-relaxed whitespace-pre-wrap mb-4">{part}</p> : null;
    });

    return (
      <div id={`exportable-msg-${msgId}`} className="w-full">
        {contentBlocks}
        {hasPdfButton && (
          <div className="flex gap-2 mt-4 pt-4 border-t border-white/10">
            <button onClick={async () => { const { exportToPDF } = await import('@/lib/export-utils'); exportToPDF(`exportable-msg-${msgId}`); }} className="flex items-center gap-2 px-4 py-2 bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 rounded-lg text-xs font-black tracking-widest uppercase transition-colors">
              <Download className="w-4 h-4" /> Export Document
            </button>
            <button onClick={async () => { const { exportToMarkdown } = await import('@/lib/export-utils'); exportToMarkdown(cleanText); }} className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white/70 rounded-lg text-xs font-black tracking-widest uppercase transition-colors">
              <FileText className="w-4 h-4" /> Raw txt
            </button>
          </div>
        )}
        {msgId.startsWith('error-') && (
          <div className="mt-4 pt-4 border-t border-red-500/20">
            <button
              onClick={() => {
                const lastUserMsg = [...messages].reverse().find(m => m.sender === 'user');
                if (lastUserMsg) handleSend(lastUserMsg.text);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded-lg text-xs font-black tracking-widest uppercase transition-colors"
            >
              <RefreshCcw className="w-4 h-4" /> Re-establish Connection
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full w-full max-w-5xl mx-auto pt-16 px-4 space-y-6 overflow-hidden">
      {/* Holographic Header Info (PS5 Style) */}
      <div className="flex justify-between items-center px-4 py-2 border-b border-white/5">
        <div className="flex items-center space-x-4">
          <div className="flex flex-col">
            <span className="text-[10px] text-blue-400 tracking-widest font-black uppercase">Core System</span>
            <span className="text-sm font-medium text-white/80">AI VERSE v3.1.2</span>
          </div>
          <div className="h-8 w-px bg-white/10" />
          <div className="flex flex-col">
            <span className="text-[10px] text-red-500 tracking-widest font-black uppercase">Network</span>
            <span className="text-sm font-medium text-white/80">ENCRYPTED</span>
          </div>
        </div>
        <div className="flex space-x-2">
          {!isOnline ? (
            offlineMode === 'utilities' ? (
              <div className="text-[10px] text-zinc-400 font-bold px-2 py-1 border border-zinc-500/30 bg-zinc-900/30 rounded">OFFLINE UTILITIES MODE</div>
            ) : (
              <div className="text-[10px] text-orange-500 font-bold animate-pulse px-2 py-1 border border-orange-500/30 bg-orange-900/30 rounded">OFFLINE MODE (OLLAMA LOCAL)</div>
            )
          ) : (
            <div className="text-[10px] text-green-500 font-bold px-2 py-1 border border-green-500/30 bg-green-900/30 rounded flex items-center gap-2"><div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" /> CLOUD UPLINK</div>
          )}
          <Shield className="w-4 h-4 text-blue-500 animate-pulse" />
          <Cpu className="w-4 h-4 text-red-500" />
        </div>
      </div>

      {showCamera && (
        <CameraVision
          onClose={() => setShowCamera(false)}
          onCaptureImage={(img) => {
            setFileContext({ type: 'image', data: img, name: 'Camera Snapshot' });
          }}
          onOCRResult={(text) => {
            setMessages(prev => [...prev, { id: Date.now().toString(), text: `OCR Scanned Text:\n${text}`, sender: 'ai', timestamp: new Date() }]);
            handleSend(`Explain or summarize this scanned text: \n\n${text}`);
          }}
        />
      )}

      {/* Messages Area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-6 px-4 py-8 pb-48 scrollbar-hide"
      >
        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, x: msg.sender === 'user' ? 50 : -50, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[80%] rounded-2xl p-4 relative group ${msg.sender === 'user'
                ? 'glass-crimson text-white rounded-tr-none'
                : 'glass text-white/90 rounded-tl-none border-blue-500/20'
                }`}>
                {/* Visual Flair */}
                <div className={`absolute top-0 ${msg.sender === 'user' ? 'right-0' : 'left-0'} w-1 h-full rounded-full ${msg.sender === 'user' ? 'bg-red-600' : 'bg-blue-600'
                  }`} />

                {renderMessageContent(msg.text, msg.id, msg.sender)}
                <div className="mt-2 flex items-center justify-between">
                  {msg.sender === 'ai' ? (
                    <div className="flex items-center space-x-3">
                      <span className="text-[8px] opacity-30 uppercase font-black tracking-widest">Core Logic</span>
                      <button
                        onClick={() => {
                          if (isSpeaking) {
                            voiceRef.current?.stopSpeaking();
                            setIsSpeaking(false);
                            onTalkingChange?.(false);
                          } else {
                            setIsSpeaking(true);
                            onTalkingChange?.(true);
                            voiceRef.current?.speak(msg.text);
                            setTimeout(() => {
                              setIsSpeaking(false);
                              onTalkingChange?.(false);
                            }, Math.min(msg.text.length * 90, 20000));
                          }
                        }}
                        className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${isSpeaking ? 'bg-red-500/20 text-red-400' : 'text-white/30 hover:text-white/80'}`}
                      >
                        <Volume2 className="w-3 h-3" />
                        {isSpeaking && <span className="text-[7px] font-black uppercase tracking-tighter">Speaking</span>}
                      </button>
                    </div>
                  ) : (
                    <span className="text-[8px] opacity-30 uppercase font-black tracking-widest">
                      Direct Input
                    </span>
                  )}
                  <span className="text-[8px] opacity-30">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
          {isLoading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
              <div className="glass p-4 rounded-2xl rounded-tl-none text-blue-400 text-xs tracking-widest font-black flex items-center space-x-2">
                <div className="w-1 h-1 bg-blue-500 animate-bounce" />
                <div className="w-1 h-1 bg-blue-500 animate-bounce [animation-delay:0.2s]" />
                <div className="w-1 h-1 bg-blue-500 animate-bounce [animation-delay:0.4s]" />
                <span>CORE PROCESSING</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Futuristic Fixed Input Area */}
      <div className="fixed bottom-0 left-0 w-full p-2 bg-linear-to-t from-black via-black/80 to-transparent z-30">
        <div className="max-w-4xl mx-auto relative">
          <div className="glass rounded-full flex items-center p-2 border border-white/10 shadow-2xl transition-all focus-within:ring-1 focus-within:ring-red-500/50">
            <button
              onClick={startVoice}
              className={`p-4 rounded-full transition-all ${isListening ? 'bg-red-600 animate-pulse' : 'hover:bg-white/5'}`}
            >
              <Mic className={`w-6 h-6 ${isListening ? 'text-white' : 'text-blue-400'}`} />
              {isListening && (
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex items-center space-x-1">
                  {[1, 2, 3, 4, 5].map(i => (
                    <motion.div
                      key={i}
                      animate={{ height: [8, 20, 8] }}
                      transition={{ repeat: Infinity, duration: 0.5, delay: i * 0.1 }}
                      className="w-1 bg-red-500 rounded-full"
                    />
                  ))}
                </div>
              )}
            </button>
            <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} accept="image/*,.pdf,.docx,.txt,.csv,.json,.md" />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-4 rounded-full transition-all hover:bg-white/5 text-slate-400 hover:text-white relative"
              disabled={isLoading}
            >
              <Paperclip className="w-5 h-5" />
              {fileContext?.type === 'image' && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-black animate-pulse" />
              )}
            </button>
            <button
              onClick={() => setShowCamera(true)}
              disabled={isLoading}
              className="p-4 rounded-full transition-all hover:bg-white/5 text-slate-400 hover:text-white"
            >
              <Camera className="w-5 h-5" />
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Query Core Intelligence..."
              className="flex-1 bg-transparent border-none outline-none px-4 text-white placeholder:text-white/20 font-light tracking-wide"
            />
            <button
              onClick={() => handleSend()}
              disabled={isLoading}
              className="p-4 bg-red-600 hover:bg-red-700 rounded-full transition-all text-white shadow-lg shadow-red-600/20 active:scale-95 group disabled:opacity-50"
            >
              <Send className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => { voiceRef.current?.stopSpeaking(); onTalkingChange?.(false); }}
              className="p-4 bg-white/5 hover:bg-white/10 rounded-full transition-all text-white/50 hover:text-white ml-2"
              title="Stop Speech"
            >
              <SquareSquare className="w-5 h-5" />
            </button>
          </div>

          <div className="mt-4 flex justify-between items-center px-8 text-[9px] text-white/20 font-black tracking-[0.2em] uppercase">
            <span>Neural Engine v4.0</span>
            <div className="flex gap-4">
              {lastAIResponseId && (
                <button
                  onClick={() => handleSend("Continue your last response precisely where you left off.")}
                  className="flex items-center gap-1 text-blue-400/50 hover:text-blue-400 transition-colors cursor-pointer"
                >
                  <Sparkles className="w-2 h-2" />
                  <span>Continue Response</span>
                </button>
              )}
              <span className="flex items-center space-x-2">
                <Sparkles className="w-2 h-2" />
                <span>Ready for Command</span>
              </span>
            </div>
            <span>Status: Online</span>
          </div>
        </div>
      </div>
    </div>
  );
}

