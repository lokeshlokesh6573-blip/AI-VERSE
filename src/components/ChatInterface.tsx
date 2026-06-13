'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Mic, Cpu, Shield, Sparkles, Paperclip, Download, FileText, Volume2, Camera, RefreshCcw, Settings, Menu, X } from 'lucide-react';
import { VoiceAssistant, getVoiceAssistant } from '@/lib/voice-assistant';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Analytics } from '@/lib/analytics';
import dynamic from 'next/dynamic';
import { SquareSquare } from 'lucide-react'; 
import CameraVision from './CameraVision';
import { useRouter } from 'next/navigation';
import ChatSidebar from './ChatSidebar';
import SettingsPanel from './settings/SettingsPanel';
import { createConversation, fetchUserConversations, fetchConversationMessages, saveMessage as saveMessageDB } from '@/lib/supabase';

const DynamicLiveCodeBlock = dynamic(() => import('./LiveCodeBlock'), { ssr: false });
const DynamicCSVAnalyzer = dynamic(() => import('./CSVAnalyzer'), { ssr: false });

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

interface ChatInterfaceProps {
  onLoadingChange?: (boolean: boolean) => void;
  onTalkingChange?: (boolean: boolean) => void;
  onListeningChange?: (boolean: boolean) => void;
}

export default function ChatInterface({ onLoadingChange, onTalkingChange, onListeningChange }: ChatInterfaceProps) {
  const { user, settings } = useAuth();
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
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<any[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const voiceRef = useRef<VoiceAssistant | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
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

  // Fetch conversations on load
  const loadConversations = async () => {
    if (!user) return;
    try {
      const data = await fetchUserConversations(user.id);
      setConversations(data);
      if (data.length > 0 && !currentConversationId) {
        handleSelectConversation(data[0].id);
      }
    } catch (err) {
      console.error("Error loading conversations:", err);
    }
  };

  useEffect(() => {
    loadConversations();
  }, [user]);

  const handleSelectConversation = async (id: string) => {
    setCurrentConversationId(id);
    setIsLoading(true);
    onLoadingChange?.(true);
    try {
      const msgs = await fetchConversationMessages(id);
      setMessages(msgs.map(m => ({
        id: m.id,
        text: m.content,
        sender: m.role as 'user' | 'ai',
        timestamp: new Date(m.created_at)
      })));
    } catch (err) {
      console.error("Error loading messages:", err);
    } finally {
      setIsLoading(false);
      onLoadingChange?.(false);
    }
  };

  const handleNewChat = async () => {
    if (!user) return;
    try {
      const newConv = await createConversation(user.id);
      setConversations([newConv, ...conversations]);
      setCurrentConversationId(newConv.id);
      setMessages([{ id: '1', text: "Systems online. How can I assist you today?", sender: 'ai', timestamp: new Date() }]);
    } catch (err) {
      console.error("Error creating chat:", err);
    }
  };

  const handleDeleteChat = async (id: string) => {
    try {
      await supabase.from('conversations').delete().eq('id', id);
      setConversations(prev => prev.filter(c => c.id !== id));
      if (currentConversationId === id) {
        setMessages([{ id: '1', text: "Chat deleted. Systems ready for new command.", sender: 'ai', timestamp: new Date() }]);
        setCurrentConversationId(null);
      }
    } catch (err) {
      console.error("Error deleting chat:", err);
    }
  };

  const saveMessage = async (conversationId: string, role: string, content: string) => {
    if (!user) return;
    try {
      await saveMessageDB(conversationId, user.id, role, content);
      // Update just this conversation updated_at in the local state
      setConversations(prev => prev.map(c => 
        c.id === conversationId ? { ...c, updated_at: new Date().toISOString() } : c
      ).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()));
    } catch (err) {
      console.error("Error saving message:", err);
    }
  };

  const handleSend = async (overrideText?: string) => {
    const text = overrideText || input;
    if (!text.trim() || isLoading) return;

    if (!currentConversationId && user) {
       await handleNewChat();
    }

    voiceRef.current?.stopSpeaking();
    setIsSpeaking(false);
    onTalkingChange?.(false);

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

    if (currentConversationId) {
       saveMessage(currentConversationId, 'user', text);
       Analytics.chatSent(user?.id);

       // Auto-title if it's currently a default title
       const currentConv = conversations.find(c => c.id === currentConversationId);
       if (currentConv && (currentConv.title === 'New Conversation' || currentConv.title === '')) {
         const newTitle = text.slice(0, 30) + (text.length > 30 ? '...' : '');
         supabase.from('conversations').update({ title: newTitle }).eq('id', currentConversationId).then(() => loadConversations());
       }
    }

    try {
      const currentFileContext = fileContext;
      if (currentFileContext) setFileContext(null);

      const payloadMessages: any[] = [...messages.map(m => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text }))];
      if (currentFileContext) {
        if (currentFileContext.type === 'text') {
          payloadMessages.push({ role: 'system', content: currentFileContext.data });
          payloadMessages.push({ role: 'user', content: text });
        } else {
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
      let payloadBody: any = { 
        messages: payloadMessages, 
        hasImage: currentFileContext?.type === 'image',
        model: settings?.model,
        response_style: settings?.response_style || 'detailed'
      };

      let headers: any = { 'Content-Type': 'application/json' };

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
        aiText += chunk;
        setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, text: aiText } : m));
      }

      setLastAIResponseId(aiMsgId);
      if (currentConversationId) {
         saveMessage(currentConversationId, 'assistant', aiText);
      }
    } catch (error) {
      console.error(error);
      const errorMsg: Message = {
        id: `error-${Date.now()}`,
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
        setMessages(prev => [...prev, { id: Date.now().toString(), text: `Successfully analyzed ${file.name}.`, sender: 'ai', timestamp: new Date() }]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
      onLoadingChange?.(false);
    }
  };

  const renderMessageContent = (text: string, msgId: string, sender: 'user' | 'ai') => {
    if (sender === 'user') return <p className="text-base leading-relaxed whitespace-pre-wrap mb-4">{text}</p>;
    const pdfRegex = /\[REQUEST_PDF\]/g;
    let cleanText = text.replace(pdfRegex, '');
    const parts = cleanText.split(/(```(?:jsx|tsx|react)[\s\S]*?```|\[GENERATE_IMAGE:\s*.*?\]|\[CSV_DATA\][\s\S]*?\[\/CSV_DATA\])/g);

    return (
      <div id={`exportable-msg-${msgId}`} className="w-full">
        {parts.map((part, index) => {
          if (part.startsWith('```')) {
            const code = part.replace(/```(?:jsx|tsx|react)\n?/, '').replace(/```$/, '').trim();
            return <DynamicLiveCodeBlock key={`code-${index}`} code={code} />;
          }
          if (part.startsWith('[GENERATE_IMAGE:')) {
            const prompt = part.replace(/\[GENERATE_IMAGE:\s*/, '').replace(/\]$/, '').trim();
            const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=768&height=432&nologo=true`;
            return <img key={`img-${index}`} src={url} alt={prompt} className="w-full rounded-xl my-4 border border-white/10" />;
          }
          if (part.startsWith('[CSV_DATA]')) {
            const csvContent = part.replace(/^\[CSV_DATA\]\n?/, '').replace(/\n?\[\/CSV_DATA\]$/, '');
            return <DynamicCSVAnalyzer key={`csv-${index}`} csvData={csvContent} />;
          }
          return part.trim() ? <p key={`txt-${index}`} className="text-base leading-relaxed whitespace-pre-wrap mb-4">{part}</p> : null;
        })}
      </div>
    );
  };

  return (
    <div className="flex h-full w-full bg-black">
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 288, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="hidden md:block shrink-0"
          >
            <ChatSidebar 
              conversations={conversations} 
              activeId={currentConversationId} 
              onSelect={handleSelectConversation} 
              onNew={handleNewChat} 
              onDelete={handleDeleteChat} 
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col relative overflow-hidden h-full">
        <div className="absolute top-4 left-4 z-50 md:hidden">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 glass rounded-full">
                {isSidebarOpen ? <X /> : <Menu />}
            </button>
        </div>

        <div className="flex-1 flex flex-col h-full w-full max-w-5xl mx-auto pt-16 px-4 space-y-6 overflow-hidden pb-32">
          {/* Holographic Header */}
          <div className="flex justify-between items-center px-4 py-2 border-b border-white/5">
            <div className="flex items-center space-x-4 font-orbitron">
              <span className="text-[10px] text-blue-400 font-black uppercase">Core System</span>
              <div className="h-8 w-px bg-white/10" />
              <span className="text-sm font-medium text-white/80">AI VERSE v3.1.2</span>
            </div>
            <div className="flex space-x-4 items-center">
              <div className="text-[10px] text-green-500 font-bold px-2 py-1 border border-green-500/30 bg-green-900/30 rounded flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" /> CLOUD UPLINK
              </div>
              <button onClick={() => setIsSettingsOpen(true)} className="hover:scale-110 transition-transform">
                <Settings className="w-4 h-4 text-red-500 cursor-pointer" />
              </button>
            </div>
          </div>

          <SettingsPanel isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

          <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-6 px-4 py-8 scrollbar-hide">
            {messages.map((msg) => (
              <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl p-4 relative glass ${msg.sender === 'user' ? 'border-red-500/20' : 'border-blue-500/20'}`}>
                  <div className={`absolute top-0 ${msg.sender === 'user' ? 'right-0' : 'left-0'} w-1 h-full rounded-full ${msg.sender === 'user' ? 'bg-red-600' : 'bg-blue-600'}`} />
                  {renderMessageContent(msg.text, msg.id, msg.sender)}
                  <p className="text-[8px] opacity-30 mt-2 text-right">{msg.timestamp.toLocaleTimeString()}</p>
                </div>
              </motion.div>
            ))}
            {isLoading && <div className="text-blue-400 text-[10px] tracking-widest font-black animate-pulse">CORE PROCESSING...</div>}
          </div>
        </div>

        {/* Input Bar */}
        <div className="absolute bottom-0 left-0 w-full p-4 bg-linear-to-t from-black via-black/80 to-transparent z-30">
          <div className="max-w-4xl mx-auto glass rounded-full flex items-center p-2 border border-white/10 shadow-2xl">
            <button onClick={startVoice} className={`p-4 rounded-full transition-all ${isListening ? 'bg-red-600 animate-pulse' : 'hover:bg-white/5'}`}>
              <Mic className={`w-6 h-6 ${isListening ? 'text-white' : 'text-blue-400'}`} />
            </button>
            <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} accept="image/*,.pdf,.docx,.txt,.csv,.json,.md" />
            <button onClick={() => fileInputRef.current?.click()} className="p-4 rounded-full hover:bg-white/5 text-slate-400">
               <Paperclip className="w-5 h-5" />
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Query Core Intelligence..."
              className="flex-1 bg-transparent border-none outline-none px-4 text-white placeholder:text-white/20 font-orbitron text-sm"
            />
            <button onClick={() => handleSend()} disabled={isLoading} className="p-4 bg-red-600 hover:bg-red-700 rounded-full transition-all text-white shadow-lg active:scale-95 disabled:opacity-50">
               <Send className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
