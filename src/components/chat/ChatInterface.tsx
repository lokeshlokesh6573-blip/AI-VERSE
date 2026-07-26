'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Mic, MicOff, Paperclip, Settings, StopCircle,
  Copy, Check, RefreshCw, ChevronDown, X,
  Camera, Sun, Moon, Cpu, Trash2, ThumbsUp, ThumbsDown,
  Volume2, VolumeX, Edit2, Sparkles, Code, PenTool, BarChart2, Search
} from 'lucide-react';
import { useSettings } from '@/context/SettingsContext';
import { getVoiceAssistant } from '@/lib/voice-assistant';
import { saveMessages, loadMessages, clearMessages as clearStorage } from '@/lib/storage';
import MarkdownRenderer from '@/components/ui/MarkdownRenderer';
import SettingsPanel from '@/components/settings/SettingsPanel';
import type { Message, FileAttachment } from '@/types';
import dynamic from 'next/dynamic';

const DynamicCameraVision = dynamic(() => import('@/components/CameraVision'), { ssr: false });

// ─── Minimal Welcome Suggestion Chips ──────────────────────────────────────
const WELCOME_SUGGESTIONS = [
  { icon: Code, label: 'Debug React code', query: 'Help me debug a React component with async state management issues.' },
  { icon: PenTool, label: 'Write & edit content', query: 'Help me draft a compelling technical blog post about AI agents.' },
  { icon: BarChart2, label: 'Analyze complex data', query: 'How can I analyze and plot multi-dimensional CSV data in Python?' },
  { icon: Search, label: 'Research AI trends', query: 'Summarize the top current trends in generative AI models for 2026.' },
];

// ─── Assistant Message Action Toolbar ───────────────────────────────────────
function AssistantMessageActions({
  message,
  isLastAI,
  onRegenerate,
  onSpeak,
  isSpeaking,
  likedState,
  onLike,
  onDislike,
}: {
  message: Message;
  isLastAI: boolean;
  onRegenerate?: () => void;
  onSpeak: () => void;
  isSpeaking: boolean;
  likedState?: 'like' | 'dislike';
  onLike: () => void;
  onDislike: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-1 mt-2.5 opacity-80 group-hover:opacity-100 transition-opacity">
      {/* Copy */}
      <button
        onClick={handleCopy}
        className="p-1.5 rounded-md text-white/40 hover:text-white hover:bg-white/10 transition-all cursor-pointer min-h-8 min-w-8 flex items-center justify-center"
        title="Copy response"
      >
        {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
      </button>

      {/* Like */}
      <button
        onClick={onLike}
        className={`p-1.5 rounded-md transition-all cursor-pointer min-h-8 min-w-8 flex items-center justify-center ${likedState === 'like' ? 'text-green-400 bg-green-500/10' : 'text-white/40 hover:text-white hover:bg-white/10'
          }`}
        title="Good response"
      >
        <ThumbsUp size={14} />
      </button>

      {/* Dislike */}
      <button
        onClick={onDislike}
        className={`p-1.5 rounded-md transition-all cursor-pointer min-h-8 min-w-8 flex items-center justify-center ${likedState === 'dislike' ? 'text-red-400 bg-red-500/10' : 'text-white/40 hover:text-white hover:bg-white/10'
          }`}
        title="Bad response"
      >
        <ThumbsDown size={14} />
      </button>

      {/* Read Aloud */}
      <button
        onClick={onSpeak}
        className={`p-1.5 rounded-md transition-all cursor-pointer min-h-8 min-w-8 flex items-center justify-center ${isSpeaking ? 'text-red-400 bg-red-500/15 animate-pulse' : 'text-white/40 hover:text-white hover:bg-white/10'
          }`}
        title={isSpeaking ? 'Stop speaking' : 'Read aloud'}
      >
        {isSpeaking ? <VolumeX size={14} /> : <Volume2 size={14} />}
      </button>

      {/* Regenerate */}
      {isLastAI && onRegenerate && (
        <button
          onClick={onRegenerate}
          className="p-1.5 rounded-md text-white/40 hover:text-white hover:bg-white/10 transition-all cursor-pointer min-h-8 min-w-8 flex items-center justify-center"
          title="Regenerate response"
        >
          <RefreshCw size={14} />
        </button>
      )}
    </div>
  );
}

// ─── User Message Action Toolbar ───────────────────────────────────────────
function UserMessageActions({
  message,
  onEdit,
}: {
  message: Message;
  onEdit: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-1 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
      {/* Edit */}
      <button
        onClick={onEdit}
        className="p-1.5 rounded-md text-white/40 hover:text-white hover:bg-white/10 transition-all cursor-pointer min-h-8 min-w-8 flex items-center justify-center"
        title="Edit message"
      >
        <Edit2 size={13} />
      </button>

      {/* Copy */}
      <button
        onClick={handleCopy}
        className="p-1.5 rounded-md text-white/40 hover:text-white hover:bg-white/10 transition-all cursor-pointer min-h-8 min-w-8 flex items-center justify-center"
        title="Copy message"
      >
        {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
      </button>
    </div>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────
function ChatHeader({
  onClear,
  onToggleTheme,
  onOpenSettings,
  theme,
}: {
  onClear: () => void;
  onToggleTheme: () => void;
  onOpenSettings: () => void;
  theme: string;
}) {
  return (
    <header className="h-14 px-4 md:px-6 flex items-center justify-between border-b border-(--border) bg-(--bg-secondary)/60 backdrop-blur-xl shrink-0 z-30">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-linear-to-br from-red-600 to-red-800 flex items-center justify-center shadow-md shadow-red-950/40 border border-red-500/30">
          <Cpu size={15} className="text-white" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-(--text-primary) tracking-widest font-display flex items-center gap-2">
            AI VERSE
          </h1>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[10px] text-(--text-muted) uppercase tracking-widest font-mono">Online</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={onClear}
          className="p-2 rounded-xl text-(--text-muted) hover:text-(--text-primary) hover:bg-(--bg-card) transition-all cursor-pointer min-h-10 min-w-10 flex items-center justify-center"
          title="Clear conversation"
        >
          <Trash2 size={16} />
        </button>
        <button
          onClick={onToggleTheme}
          className="p-2 rounded-xl text-(--text-muted) hover:text-(--text-primary) hover:bg-(--bg-card) transition-all cursor-pointer min-h-10 min-w-10 flex items-center justify-center"
          title="Toggle theme"
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <button
          onClick={onOpenSettings}
          className="p-2 rounded-xl text-(--text-muted) hover:text-(--text-primary) hover:bg-(--bg-card) transition-all cursor-pointer min-h-10 min-w-10 flex items-center justify-center"
          title="Settings"
        >
          <Settings size={16} />
        </button>
      </div>
    </header>
  );
}

// ─── File Attachment Preview Pill ──────────────────────────────────────────────
function AttachmentPreview({
  attachment,
  onRemove,
}: {
  attachment: FileAttachment;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-2.5 px-3.5 py-2 bg-white/8 rounded-2xl border border-white/12 max-w-xs shadow-lg backdrop-blur-md">
      <div className="w-7 h-7 rounded-lg bg-red-600/30 border border-red-500/30 flex items-center justify-center shrink-0 text-xs">
        {attachment.type === 'image' ? '🖼️' : '📄'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-white/90 truncate">{attachment.name}</p>
        <p className="text-[10px] text-white/40 uppercase tracking-wider">{attachment.type}</p>
      </div>
      <button
        onClick={onRemove}
        className="text-white/40 hover:text-red-400 transition-colors shrink-0 p-1 rounded-full hover:bg-white/10 cursor-pointer"
      >
        <X size={14} />
      </button>
    </div>
  );
}

// ─── Main ChatInterface Component ─────────────────────────────────────────────
interface ChatInterfaceProps {
  onLoadingChange?: (v: boolean) => void;
  onTalkingChange?: (v: boolean) => void;
  onListeningChange?: (v: boolean) => void;
}

export default function ChatInterface({
  onLoadingChange,
  onTalkingChange,
  onListeningChange,
}: ChatInterfaceProps) {
  const { settings, updateSettings } = useSettings();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [attachment, setAttachment] = useState<FileAttachment | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  // Additional action states
  const [likedMessages, setLikedMessages] = useState<Record<string, 'like' | 'dislike'>>({});
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editInput, setEditInput] = useState('');

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const voiceRef = useRef(typeof window !== 'undefined' ? getVoiceAssistant() : null);

  // Load saved messages on mount
  useEffect(() => {
    const saved = loadMessages();
    if (saved.length > 0) setMessages(saved);
  }, []);

  // Persist messages on change
  useEffect(() => {
    if (messages.length > 0) saveMessages(messages);
  }, [messages]);

  // Auto-scroll
  const scrollToBottom = useCallback((smooth = true) => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto',
      });
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Handle scroll detection
  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 100);
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 180) + 'px';
    }
  }, [input]);

  // ── Core send handler ───────────────────────────────────────────────────────
  const handleSend = useCallback(async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text && !attachment) return;
    if (isLoading) return;

    // Clear input immediately
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    const currentAttachment = attachment;
    setAttachment(null);

    // Add user message
    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: text || `[Attached: ${currentAttachment?.name}]`,
      timestamp: new Date(),
      attachment: currentAttachment ?? undefined,
    };
    setMessages(prev => [...prev, userMsg]);

    setIsLoading(true);
    onLoadingChange?.(true);

    // Build streamed AI message placeholder
    const aiId = `a-${Date.now()}`;
    setMessages(prev => [
      ...prev,
      { id: aiId, role: 'assistant', content: '', timestamp: new Date(), isStreaming: true },
    ]);

    const ctrl = new AbortController();
    setAbortController(ctrl);

    try {
      // Build messages payload
      const historySlice = messages.slice(-20);
      const payloadMessages = [
        ...historySlice.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
        { role: 'user', content: text },
      ];

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: ctrl.signal,
        body: JSON.stringify({
          messages: payloadMessages,
          model: settings.model,
          temperature: settings.temperature,
          maxTokens: settings.maxTokens,
          responseStyle: settings.responseStyle,
          hasImage: currentAttachment?.type === 'image',
          imageData: currentAttachment?.type === 'image' ? currentAttachment.data : undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
        throw new Error(err.message || 'Request failed');
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let accum = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          accum += decoder.decode(value, { stream: true });
          const captured = accum;
          setMessages(prev =>
            prev.map(m => m.id === aiId ? { ...m, content: captured, isStreaming: true } : m)
          );
        }
      }

      // Finalize streaming
      setMessages(prev =>
        prev.map(m => m.id === aiId ? { ...m, content: accum, isStreaming: false } : m)
      );

    } catch (err: any) {
      if (err.name === 'AbortError') {
        setMessages(prev =>
          prev.map(m => m.id === aiId ? { ...m, isStreaming: false } : m)
        );
      } else {
        const errMsg = err?.message || 'Something went wrong. Please try again.';
        setMessages(prev =>
          prev.map(m =>
            m.id === aiId
              ? { ...m, content: `⚠️ **Error:** ${errMsg}`, isStreaming: false, isError: true }
              : m
          )
        );
      }
    } finally {
      setIsLoading(false);
      setAbortController(null);
      onLoadingChange?.(false);
      textareaRef.current?.focus();
    }
  }, [input, attachment, isLoading, messages, settings, onLoadingChange]);

  // ── Stop generation ─────────────────────────────────────────────────────────
  const handleStop = useCallback(() => {
    abortController?.abort();
  }, [abortController]);

  // ── Regenerate last AI response ─────────────────────────────────────────────
  const handleRegenerate = useCallback(() => {
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
    if (!lastUserMsg) return;
    setMessages(prev => {
      const withoutLastAI = [...prev];
      for (let i = withoutLastAI.length - 1; i >= 0; i--) {
        if (withoutLastAI[i].role === 'assistant') {
          withoutLastAI.splice(i, 1);
          break;
        }
      }
      return withoutLastAI;
    });
    setTimeout(() => handleSend(lastUserMsg.content), 50);
  }, [messages, handleSend]);

  // ── Read Aloud / Speech ─────────────────────────────────────────────────────
  const handleSpeak = useCallback((msgId: string, text: string) => {
    if (speakingId === msgId) {
      voiceRef.current?.stopSpeaking();
      setSpeakingId(null);
      onTalkingChange?.(false);
    } else {
      voiceRef.current?.stopSpeaking();
      setSpeakingId(msgId);
      onTalkingChange?.(true);
      voiceRef.current?.speak(text);
    }
  }, [speakingId, onTalkingChange]);

  // ── Like / Dislike ──────────────────────────────────────────────────────────
  const handleLikeToggle = (id: string, type: 'like' | 'dislike') => {
    setLikedMessages(prev => ({
      ...prev,
      [id]: prev[id] === type ? (undefined as any) : type,
    }));
  };

  // ── Edit user message ───────────────────────────────────────────────────────
  const startEditUserMsg = (msg: Message) => {
    setEditingId(msg.id);
    setEditInput(msg.content);
  };

  const saveEditUserMsg = (msgId: string) => {
    const trimmed = editInput.trim();
    if (!trimmed) return;

    // Find index of edited message
    const msgIndex = messages.findIndex(m => m.id === msgId);
    if (msgIndex === -1) return;

    // Truncate message history up to this message
    const updatedHistory = messages.slice(0, msgIndex);
    setMessages(updatedHistory);
    setEditingId(null);
    setEditInput('');

    // Trigger send with edited text
    setTimeout(() => handleSend(trimmed), 50);
  };

  // ── Voice input ─────────────────────────────────────────────────────────────
  const handleVoice = useCallback(() => {
    if (isListening) return;
    setIsListening(true);
    onListeningChange?.(true);
    voiceRef.current?.listen(
      (text) => {
        setIsListening(false);
        onListeningChange?.(false);
        setInput(text);
        textareaRef.current?.focus();
      },
      () => {
        setIsListening(false);
        onListeningChange?.(false);
      }
    );
  }, [isListening, onListeningChange]);

  // ── File upload ─────────────────────────────────────────────────────────────
  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    try {
      const isImage = file.type.startsWith('image/');
      if (isImage) {
        const { parseFileBase64 } = await import('@/lib/file-parser');
        const data = await parseFileBase64(file);
        setAttachment({ type: 'image', data, name: file.name, mimeType: file.type });
      } else {
        const { parseFileText } = await import('@/lib/file-parser');
        const text = await parseFileText(file);
        setAttachment({
          type: 'text',
          data: `[Document: ${file.name}]\n\n${text}`,
          name: file.name,
          mimeType: file.type,
        });
        setInput(prev => prev || `Please analyze this document: ${file.name}`);
      }
    } catch (err: any) {
      console.error('File parse error:', err);
    }
  }, []);

  // ── Camera capture ──────────────────────────────────────────────────────────
  const handleCameraCapture = useCallback((base64: string) => {
    setAttachment({ type: 'image', data: base64, name: 'camera-capture.jpg', mimeType: 'image/jpeg' });
    setShowCamera(false);
    setInput(prev => prev || 'What do you see in this image?');
  }, []);

  const handleOCRResult = useCallback((text: string) => {
    setInput(`I captured this text via OCR:\n\n${text}\n\nPlease help me with this.`);
    setShowCamera(false);
  }, []);

  // ── Clear chat ──────────────────────────────────────────────────────────────
  const handleClear = useCallback(() => {
    setMessages([]);
    setAttachment(null);
    setInput('');
    setEditingId(null);
    voiceRef.current?.stopSpeaking();
    setSpeakingId(null);
    clearStorage();
  }, []);

  // ── Theme toggle ────────────────────────────────────────────────────────────
  const handleToggleTheme = useCallback(() => {
    updateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' });
  }, [settings.theme, updateSettings]);

  // ── Keyboard submission ─────────────────────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full w-full overflow-x-hidden relative">
      {/* Settings Panel */}
      <SettingsPanel isOpen={showSettings} onClose={() => setShowSettings(false)} />

      {/* Header */}
      <ChatHeader
        onClear={handleClear}
        onToggleTheme={handleToggleTheme}
        onOpenSettings={() => setShowSettings(true)}
        theme={settings.theme}
      />

      {/* Messages / Welcome Area */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto chat-scroll px-4 md:px-6 py-6 md:py-8"
      >
        {/* Welcome Screen (Display ONLY "How can I help you today?") */}
        {messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-[850px] mx-auto min-h-[60vh] flex flex-col items-center justify-center text-center px-4"
          >
            {/* Brand icon / glowing core badge */}
            <div className="mb-6 relative">
              <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-red-600 to-red-800 flex items-center justify-center shadow-[0_0_40px_rgba(230,36,41,0.4)] border border-red-500/30">
                <Sparkles size={30} className="text-white animate-pulse" />
              </div>
            </div>

            {/* ONLY display "How can I help you today?" as required */}
            <h2 className="text-2xl md:text-4xl font-extrabold text-(--text-primary) tracking-tight mb-8">
              How can I help you today?
            </h2>

            {/* Minimal suggestion chips */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
              {WELCOME_SUGGESTIONS.map((s, i) => {
                const IconComponent = s.icon;
                return (
                  <motion.button
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * i, duration: 0.3 }}
                    onClick={() => handleSend(s.query)}
                    className="p-4 rounded-2xl glass hover:bg-(--bg-card) hover:border-red-500/40 text-left transition-all group flex items-start gap-3.5 border border-(--border) cursor-pointer shadow-lg"
                  >
                    <div className="p-2 rounded-xl bg-red-600/15 border border-red-500/20 text-red-500 group-hover:text-white group-hover:bg-red-600 transition-colors shrink-0">
                      <IconComponent size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-(--text-primary) group-hover:text-(--text-primary) transition-colors">
                        {s.label}
                      </p>
                      <p className="text-xs text-(--text-muted) line-clamp-1 mt-0.5">
                        {s.query}
                      </p>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Message Feed */}
        {messages.map((msg, idx) => {
          const isUser = msg.role === 'user';
          const isLastAI = !isUser && idx === messages.length - 1;

          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`max-w-[850px] mx-auto flex ${isUser ? 'justify-end' : 'justify-start'} group`}
            >
              {/* AI Avatar badge */}
              {!isUser && (
                <div className="w-8 h-8 rounded-xl bg-linear-to-br from-red-600 to-red-800 flex items-center justify-center shrink-0 mt-1 mr-3.5 shadow-md shadow-red-950/40 border border-red-500/30">
                  <Cpu size={15} className="text-white" />
                </div>
              )}

              {/* Message Content Container */}
              <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[88%] md:max-w-[80%]`}>
                {/* User Attachment preview */}
                {isUser && msg.attachment && (
                  <div className="mb-2">
                    {msg.attachment.type === 'image' ? (
                      <img
                        src={msg.attachment.data}
                        alt={msg.attachment.name}
                        className="rounded-2xl max-w-xs border border-(--border) shadow-xl"
                      />
                    ) : (
                      <div className="flex items-center gap-2 px-3.5 py-2 bg-(--bg-card) rounded-xl border border-(--border) text-xs text-(--text-secondary) backdrop-blur-md">
                        📄 {msg.attachment.name}
                      </div>
                    )}
                  </div>
                )}

                {/* Inline Editing for User Message */}
                {isUser && editingId === msg.id ? (
                  <div className="w-full bg-(--bg-secondary) border border-red-500/40 rounded-2xl p-3 shadow-2xl">
                    <textarea
                      value={editInput}
                      onChange={e => setEditInput(e.target.value)}
                      className="w-full bg-transparent text-(--text-primary) text-sm outline-none resize-none min-h-20"
                    />
                    <div className="flex justify-end gap-2 mt-2">
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-3 py-1.5 text-xs text-(--text-muted) hover:text-(--text-primary) rounded-lg transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => saveEditUserMsg(msg.id)}
                        className="px-3.5 py-1.5 text-xs font-semibold bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors cursor-pointer shadow-md"
                      >
                        Save & Resend
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Standard Message Bubble / Clean layout */
                  <div
                    className={`${isUser
                      ? 'bg-linear-to-r from-red-600 to-red-700 text-white rounded-2xl rounded-tr-sm px-4 md:px-5 py-3 shadow-lg shadow-red-950/30 border border-red-500/20 text-sm md:text-[15px]'
                      : 'w-full py-1 text-(--msg-ai-text)'
                      } ${msg.isError ? 'border-red-500/50 bg-red-950/20 p-4 rounded-2xl' : ''}`}
                  >
                    {isUser ? (
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    ) : msg.content ? (
                      <MarkdownRenderer content={msg.content} isStreaming={msg.isStreaming} />
                    ) : msg.isStreaming ? null : (
                      <p className="text-white/40 text-sm italic">Empty response</p>
                    )}
                  </div>
                )}

                {/* Actions Bar & Timestamp */}
                {!isUser && !msg.isStreaming && msg.content && (
                  <AssistantMessageActions
                    message={msg}
                    isLastAI={isLastAI}
                    onRegenerate={handleRegenerate}
                    onSpeak={() => handleSpeak(msg.id, msg.content)}
                    isSpeaking={speakingId === msg.id}
                    likedState={likedMessages[msg.id]}
                    onLike={() => handleLikeToggle(msg.id, 'like')}
                    onDislike={() => handleLikeToggle(msg.id, 'dislike')}
                  />
                )}

                {isUser && editingId !== msg.id && (
                  <UserMessageActions
                    message={msg}
                    onEdit={() => startEditUserMsg(msg)}
                  />
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Scroll to Bottom Button */}
      <AnimatePresence>
        {showScrollBtn && (
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            onClick={() => scrollToBottom()}
            className="absolute bottom-28 right-6 p-3 glass rounded-full shadow-2xl text-white/70 hover:text-white transition-all z-20 cursor-pointer border border-white/10 hover:border-red-500/40"
          >
            <ChevronDown size={18} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Dynamic Camera Vision Modal */}
      <AnimatePresence>
        {showCamera && (
          <DynamicCameraVision
            onClose={() => setShowCamera(false)}
            onCaptureImage={handleCameraCapture}
            onOCRResult={handleOCRResult}
          />
        )}
      </AnimatePresence>

      {/* Floating Redesigned Input Bar Container */}
      <div className="shrink-0 max-w-[850px] w-full mx-auto px-4 md:px-6 sticky bottom-0 z-30 pb-4 md:pb-6 pt-2">
        {/* Attachment preview capsule above input */}
        <AnimatePresence>
          {attachment && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="mb-2.5"
            >
              <AttachmentPreview attachment={attachment} onRemove={() => setAttachment(null)} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Capsule Bar */}
        <div className="w-full bg-(--glass-bg) backdrop-blur-2xl border border-(--border) rounded-3xl p-2 md:p-2.5 shadow-lg focus-within:border-red-500/50 focus-within:shadow-[0_0_30px_rgba(230,36,41,0.15)] transition-all">
          <div className="flex items-end gap-1.5">
            {/* Left Action Buttons (Attachment & Camera) */}
            <div className="flex items-center gap-0.5 shrink-0 pb-1">
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileChange}
                accept="image/*,.pdf,.docx,.txt,.csv,.json,.md,.xlsx"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2.5 rounded-2xl text-(--text-muted) hover:text-(--text-primary) hover:bg-(--bg-card) transition-all cursor-pointer min-h-11 min-w-11 flex items-center justify-center"
                title="Attach file"
              >
                <Paperclip size={18} />
              </button>
              <button
                onClick={() => setShowCamera(true)}
                className="p-2.5 rounded-2xl text-(--text-muted) hover:text-(--text-primary) hover:bg-(--bg-card) transition-all cursor-pointer min-h-11 min-w-11 flex items-center justify-center"
                title="Camera / Vision"
              >
                <Camera size={18} />
              </button>
            </div>

            {/* Auto-expanding Input Area */}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              placeholder="Ask AI Verse anything..."
              rows={1}
              className="flex-1 bg-transparent border-none outline-none resize-none text-sm md:text-base text-(--text-primary) placeholder:text-(--text-muted) leading-relaxed py-2.5 px-2 max-h-45 scrollbar-hide font-sans"
            />

            {/* Right Action Buttons (Voice & Send/Stop) */}
            <div className="flex items-center gap-1 shrink-0 pb-0.5">
              <button
                onClick={handleVoice}
                disabled={isLoading}
                className={`p-2.5 rounded-2xl transition-all cursor-pointer min-h-11 min-w-11 flex items-center justify-center ${isListening
                  ? 'bg-red-600 text-white animate-pulse shadow-[0_0_15px_rgba(220,38,38,0.6)]'
                  : 'text-(--text-muted) hover:text-(--text-primary) hover:bg-(--bg-card)'
                  } disabled:opacity-40`}
                title={isListening ? 'Listening...' : 'Voice input'}
              >
                {isListening ? <MicOff size={18} /> : <Mic size={18} />}
              </button>

              {isLoading ? (
                <button
                  onClick={handleStop}
                  className="p-2.5 rounded-2xl bg-red-600/90 hover:bg-red-600 text-white transition-all cursor-pointer min-h-11 min-w-11 flex items-center justify-center shadow-lg shadow-red-950/50"
                  title="Stop generation"
                >
                  <StopCircle size={18} />
                </button>
              ) : (
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim() && !attachment}
                  className="p-2.5 rounded-2xl bg-linear-to-br from-red-600 to-red-800 text-white shadow-lg shadow-red-950/50 hover:shadow-[0_0_20px_rgba(230,36,41,0.5)] hover:scale-105 transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed disabled:scale-100 disabled:shadow-none cursor-pointer min-h-11 min-w-11 flex items-center justify-center"
                  title="Send message"
                >
                  <Send size={18} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer Subtext */}
        <p className="text-center text-[10px] text-(--text-muted) mt-2 font-mono uppercase tracking-wider">
          AI Verse may produce inaccurate information. · Created by Lokesh
        </p>
      </div>
    </div>
  );
}
