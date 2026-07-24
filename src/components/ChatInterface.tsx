'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Mic, Cpu, Shield, Settings, Menu, X, Paperclip } from 'lucide-react';
import { VoiceAssistant, getVoiceAssistant } from '@/lib/voice-assistant';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Analytics } from '@/lib/analytics';
import dynamic from 'next/dynamic';
import CameraVision from './CameraVision';
import { useRouter } from 'next/navigation';
import ChatSidebar from './ChatSidebar';

import { createConversation, fetchUserConversations, fetchConversationMessages, saveMessage as saveMessageDB } from '@/lib/supabase';
import { cn } from '@/utils/cn';

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
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  const loadConversations = async () => {
    if (!user) return;
    try {
      const data = await fetchUserConversations(user.id);
      setConversations(data);
      if (data.length > 0 && !currentConversationId) {
        handleSelectConversation(data[0].id);
      } else if (data.length === 0 && !currentConversationId) {
        // Auto-initialize a conversation so currentConversationId is set
        const initConv = await createConversation(user.id, 'New Conversation');
        setConversations([initConv]);
        setCurrentConversationId(initConv.id);
      }
    } catch (err) {
      console.warn("Error loading conversations:", err);
      if (!currentConversationId) {
        const localId = `local-conv-${Date.now()}`;
        setCurrentConversationId(localId);
      }
    }
  };

  useEffect(() => {
    loadConversations();
  }, [user]);

  // Safety net: if isLoading gets stuck, reset it after 15s
  useEffect(() => {
    if (!isLoading) return;
    const safetyTimer = setTimeout(() => {
      console.warn('[ChatInterface] isLoading safety reset triggered after 15s');
      setIsLoading(false);
      onLoadingChange?.(false);
    }, 15000);
    return () => clearTimeout(safetyTimer);
  }, [isLoading]);

  const handleSelectConversation = async (id: string) => {
    console.log('[ChatInterface] handleSelectConversation called for id:', id);
    setCurrentConversationId(id);
    setIsLoading(true);
    onLoadingChange?.(true);
    try {
      const msgs = await fetchConversationMessages(id);
      if (msgs && msgs.length > 0) {
        setMessages(msgs.map(m => ({
          id: m.id,
          text: m.content,
          sender: m.role as 'user' | 'ai',
          timestamp: new Date(m.created_at)
        })));
      } else {
        setMessages([{ id: '1', text: "Systems online. How can I assist you today?", sender: 'ai', timestamp: new Date() }]);
      }
    } catch (err) {
      console.error('[ChatInterface] Error loading messages:', err);
    } finally {
      setIsLoading(false);
      onLoadingChange?.(false);
    }
  };

  const handleNewChat = async () => {
    const userId = user?.id || 'guest';
    try {
      const newConv = await createConversation(userId, 'New Conversation');
      setConversations(prev => [newConv, ...prev.filter(c => c.id !== newConv.id)]);
      setCurrentConversationId(newConv.id);
      setMessages([{ id: '1', text: "Systems online. How can I assist you today?", sender: 'ai', timestamp: new Date() }]);
    } catch (err) {
      console.error("Error creating chat:", err);
      const localId = `local-conv-${Date.now()}`;
      setCurrentConversationId(localId);
      setMessages([{ id: '1', text: "Systems online. How can I assist you today?", sender: 'ai', timestamp: new Date() }]);
    }
  };

  const handleDeleteChat = async (id: string) => {
    try {
      if (user && !user.id?.startsWith('mock-') && !id.startsWith('local-conv-')) {
        await supabase.from('conversations').delete().eq('id', id);
      }
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
    const userId = user?.id || 'guest';
    try {
      await saveMessageDB(conversationId, userId, role, content);
      setConversations(prev => prev.map(c =>
        c.id === conversationId ? { ...c, updated_at: new Date().toISOString() } : c
      ).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()));
    } catch (err) {
      console.error("Error saving message:", err);
    }
  };

  const handleSend = async (overrideText?: string) => {
    console.log('[ChatInterface] handleSend initiated. Input:', JSON.stringify(overrideText ?? input));

    const text = overrideText || input;

    if (!text.trim()) {
      return;
    }

    if (isLoading) {
      console.warn('[ChatInterface] Early return: busy loading previous request.');
      return;
    }

    voiceRef.current?.stopSpeaking();
    setIsSpeaking(false);
    onTalkingChange?.(false);

    setIsLoading(true);
    onLoadingChange?.(true);

    const userMsg: Message = {
      id: Date.now().toString(),
      text,
      sender: 'user',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');

    // Ensure valid target conversation ID
    let targetConvId = currentConversationId;
    if (!targetConvId) {
      console.log('[ChatInterface] No active conv ID — auto-creating conversation...');
      const userId = user?.id || 'guest';
      try {
        const titleSnippet = text.length > 25 ? text.substring(0, 25) + '...' : text;
        const newConv = await createConversation(userId, titleSnippet);
        targetConvId = newConv.id;
        setCurrentConversationId(targetConvId);
        setConversations(prev => [newConv, ...prev.filter(c => c.id !== targetConvId)]);
      } catch (convErr) {
        console.warn('[ChatInterface] Failed to create conv on DB, using local ID:', convErr);
        targetConvId = `local-conv-${Date.now()}`;
        setCurrentConversationId(targetConvId);
      }
    }

    // Persist user message
    if (targetConvId) {
      saveMessage(targetConvId, 'user', text);
    }
    try {
      if (user?.id && !user.id.startsWith('mock-')) Analytics.chatSent(user.id);
    } catch (analyticsErr) {
      console.warn('[ChatInterface] Analytics notice:', analyticsErr);
    }

    // API Call
    try {
      const currentFileContext = fileContext;
      if (currentFileContext) setFileContext(null);

      const payloadMessages: any[] = [
        ...messages.map(m => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text }))
      ];
      payloadMessages.push({ role: 'user', content: text });

      console.log('[ChatInterface] Sending request to /api/chat. Model:', settings?.model || 'default');

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: payloadMessages,
          hasImage: currentFileContext?.type === 'image',
          imageData: currentFileContext?.type === 'image' ? currentFileContext.data : null,
          model: settings?.model,
          response_style: settings?.response_style || 'detailed'
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({ message: 'HTTP Error ' + response.status }));
        throw new Error(errJson.message || `API request failed with status ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let aiText = '';

      const aiMsgId = (Date.now() + 1).toString();
      setMessages(prev => [...prev, { id: aiMsgId, text: '', sender: 'ai', timestamp: new Date() }]);

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          aiText += chunk;
          setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, text: aiText } : m));
        }
      }

      if (targetConvId) {
        saveMessage(targetConvId, 'assistant', aiText);
      }
    } catch (error: any) {
      console.error('[ChatInterface] Error during completion stream:', error);
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        text: `Error connecting to Core Intelligence: ${error?.message || 'Server error'}. Please try again.`,
        sender: 'ai',
        timestamp: new Date()
      }]);
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
      } else {
        const { parseFileText } = await import('@/lib/file-parser');
        const text = await parseFileText(file);
        setFileContext({ type: 'text', data: `[FILE "${file.name}": ${text}]`, name: file.name });
      }
      setMessages(prev => [...prev, { id: Date.now().toString(), text: `Processed ${file.name}.`, sender: 'ai', timestamp: new Date() }]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
      onLoadingChange?.(false);
    }
  };

  const renderMessageContent = (text: string, sender: 'user' | 'ai') => {
    if (sender === 'user') return <p className="whitespace-pre-wrap">{text}</p>;

    const parts = text.split(/(\[GENERATE_IMAGE:.*?\]|\[CSV_DATA\].*?\[\/CSV_DATA\])/g);

    return (
      <div className="prose prose-invert max-w-none text-sm md:text-base">
        {parts.map((part, index) => {
          if (!part) return null;
          if (part.startsWith('[GENERATE_IMAGE:')) {
            const prompt = part.replace(/\[GENERATE_IMAGE:\s*/, '').replace(/\]$/, '').trim();
            const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=768&height=432&nologo=true`;
            return <img key={index} src={url} alt="Gen" className="w-full rounded-xl my-4 border border-white/10" />;
          }
          if (part.startsWith('[CSV_DATA]')) {
            const csv = part.replace(/^\[CSV_DATA\]\n?/, '').replace(/\n?\[\/CSV_DATA\]$/, '');
            return <DynamicCSVAnalyzer key={index} csvData={csv} />;
          }
          return <p key={index} className="whitespace-pre-wrap mb-4">{part}</p>;
        })}
      </div>
    );
  };

  return (
    <div className="flex h-full w-full bg-background text-foreground transition-colors duration-300">
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            {isMobile && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black z-45"
                onClick={() => setIsSidebarOpen(false)}
              />
            )}
            <motion.div
              initial={isMobile ? { x: -288 } : { width: 0, opacity: 0 }}
              animate={isMobile ? { x: 0 } : { width: 288, opacity: 1 }}
              exit={isMobile ? { x: -288 } : { width: 0, opacity: 0 }}
              transition={{ type: 'tween', duration: 0.3 }}
              className={cn(
                "shrink-0 border-r border-white/5",
                isMobile 
                  ? "fixed inset-y-0 left-0 w-72 bg-zinc-950/95 backdrop-blur-xl z-50 h-full" 
                  : "relative h-full"
              )}
            >
              <ChatSidebar
                conversations={conversations}
                activeId={currentConversationId}
                onSelect={(id) => {
                  handleSelectConversation(id);
                  if (isMobile) setIsSidebarOpen(false);
                }}
                onNew={() => {
                  handleNewChat();
                  if (isMobile) setIsSidebarOpen(false);
                }}
                onDelete={handleDeleteChat}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col relative overflow-hidden h-full">
        <div className="absolute top-4 left-4 z-50 md:hidden">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 glass rounded-full text-white">
            {isSidebarOpen ? <X /> : <Menu />}
          </button>
        </div>

        <div className="flex flex-col h-full">
          <div className="h-16 px-6 flex items-center justify-between border-b border-white/10 bg-background/50 backdrop-blur-md z-40">
            <div className="flex items-center space-x-3 pl-12 md:pl-0">
              <Cpu className="text-blue-500 w-5 h-5 animate-pulse" />
              <span className="text-sm font-medium opacity-80 uppercase tracking-widest font-orbitron">AI VERSE v3.1.2</span>
            </div>
            <div className="flex space-x-4 items-center">
              <div className="text-[10px] text-green-500 font-bold px-2 py-1 border border-green-500/30 bg-green-900/30 rounded flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" /> CLOUD_LINK
              </div>
              <button onClick={() => router.push('/settings')} className="p-2 hover:bg-white/5 rounded-xl transition-all">
                <Settings className="w-4 h-4 text-red-500" />
              </button>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-6 px-4 pt-8 pb-32 scrollbar-hide">
            {messages.map((msg) => (
              <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={cn(
                  "max-w-[80%] rounded-2xl p-4 relative glass",
                  msg.sender === 'user' ? "border-red-500/20" : "border-blue-500/20"
                )}>
                  <div className={cn(
                    "absolute top-0 w-1 h-full rounded-full",
                    msg.sender === 'user' ? "right-0 bg-red-600" : "left-0 bg-blue-600"
                  )} />
                  {renderMessageContent(msg.text, msg.sender)}
                  <p className="text-[8px] opacity-30 mt-2 text-right">{msg.timestamp.toLocaleTimeString()}</p>
                </div>
              </motion.div>
            ))}
            {isLoading && (
              <div className="flex items-center gap-3 ml-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" />
                <div className="text-blue-400 text-[10px] tracking-widest font-black uppercase font-orbitron">Processing...</div>
              </div>
            )}
          </div>
        </div>

        <div className="absolute bottom-0 left-0 w-full p-4 bg-linear-to-t from-black via-black/80 to-transparent z-30">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="max-w-4xl mx-auto bg-zinc-950/90 backdrop-blur-xl rounded-full flex items-center p-2 border border-white/15 shadow-2xl relative z-40"
          >
            <button type="button" onClick={startVoice} className={cn("p-4 rounded-full transition-all", isListening ? "bg-red-600 animate-pulse" : "hover:bg-white/5")}>
              <Mic className={cn("w-6 h-6", isListening ? "text-white" : "text-blue-400")} />
            </button>
            <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} accept="image/*,.pdf,.docx,.txt,.csv,.json,.md" />
            <button type="button" onClick={() => fileInputRef.current?.click()} className="p-4 rounded-full hover:bg-white/5 text-zinc-500">
              <Paperclip className="w-5 h-5" />
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Query Core Intelligence..."
              className="flex-1 bg-transparent border-none outline-none px-4 text-foreground placeholder:text-foreground/30 font-orbitron text-sm"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="p-4 bg-red-600 hover:bg-red-700 rounded-full transition-all text-white shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <Send className="w-6 h-6" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
