'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Mic, Cpu, Shield, Sparkles, Paperclip, Download, FileText, Volume2 } from 'lucide-react';
import { VoiceAssistant } from '@/lib/voice-assistant';
import dynamic from 'next/dynamic';

const DynamicLiveCodeBlock = dynamic(() => import('./LiveCodeBlock'), { ssr: false });


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
  const [fileContext, setFileContext] = useState<{type: 'text'|'image', data: string, name: string} | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const voiceRef = useRef<VoiceAssistant | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    voiceRef.current = new VoiceAssistant();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (overrideText?: string) => {
    const text = overrideText || input;
    if (!text.trim() || isLoading) return;

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

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: payloadMessages, hasImage: currentFileContext?.type === 'image' }),
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
        aiText += chunk;

        setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, text: aiText } : m));
      }

      // Voice Output removed from automation. It is now explicitly triggered by user request.
    } catch (error) {
      console.error(error);
      const errorMsg: Message = {
        id: Date.now().toString(),
        text: "Error connecting to Core Intelligence. Please check your network.",
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
         setFileContext({ type: 'text', data: `[CONTENTS OF UPLOADED FILE "${file.name}":\n${text}\n]`, name: file.name });
         setMessages(prev => [...prev, {
           id: Date.now().toString(),
           text: `Successfully analyzed ${file.name}. Ready for your queries.`,
           sender: 'ai',
           timestamp: new Date()
         }]);
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
    if (sender === 'user') return <p className="text-base leading-relaxed whitespace-pre-wrap">{text}</p>;

    const pdfRegex = /\[REQUEST_PDF\]/g;
    let hasPdfButton = pdfRegex.test(text);
    let cleanText = text.replace(pdfRegex, '');

    // Split text into normal text, React Code blocks, or Images
    const parts = cleanText.split(/(```(?:jsx|tsx|react)[\s\S]*?```|\[GENERATE_IMAGE:\s*.*?\])/g);

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
       </div>
    );
  };

  return (
    <div className="flex flex-col h-full w-full max-w-5xl mx-auto pt-16 pb-32 px-4 space-y-6">
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
          <Shield className="w-4 h-4 text-blue-500 animate-pulse" />
          <Cpu className="w-4 h-4 text-red-500" />
        </div>
      </div>

      {/* Messages Area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-6 px-4 py-8 scrollbar-hide"
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
                       <button onClick={() => { onTalkingChange?.(true); voiceRef.current?.speak(msg.text); setTimeout(() => onTalkingChange?.(false), Math.min(msg.text.length * 60, 8000)); }} className="text-white/30 hover:text-white/80 transition-colors">
                         <Volume2 className="w-3 h-3" />
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
      <div className="fixed bottom-0 left-0 w-full p-8 bg-linear-to-t from-black via-black/80 to-transparent z-30">
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
          </div>

          <div className="mt-4 flex justify-between px-8 text-[9px] text-white/20 font-black tracking-[0.2em] uppercase">
            <span>Neural Engine v4.0</span>
            <span className="flex items-center space-x-2">
              <Sparkles className="w-2 h-2" />
              <span>Ready for Command</span>
            </span>
            <span>Status: Online</span>
          </div>
        </div>
      </div>
    </div>
  );
}

