'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Mic, MicOff, Paperclip, Settings, StopCircle,
  Copy, Check, RefreshCw, ChevronDown, Globe, X,
  Camera, Sun, Moon, Cpu, Trash2, RotateCcw
} from 'lucide-react';
import { useSettings } from '@/context/SettingsContext';
import { getVoiceAssistant } from '@/lib/voice-assistant';
import MarkdownRenderer from '@/components/ui/MarkdownRenderer';
import type { Message, FileAttachment } from '@/types';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';

const DynamicCameraVision = dynamic(() => import('@/components/CameraVision'), { ssr: false });

// ─── Welcome suggestions ──────────────────────────────────────────────────────
const SUGGESTIONS = [
  { icon: '💻', text: 'Debug my React code', category: 'Code' },
  { icon: '🔍', text: 'Explain a complex algorithm', category: 'Learn' },
  { icon: '✍️', text: 'Help me write an essay', category: 'Write' },
  { icon: '📊', text: 'Analyze this data for me', category: 'Data' },
  { icon: '🌐', text: 'Search latest AI news', category: 'Research' },
  { icon: '🧮', text: 'Solve a math problem', category: 'Math' },
];

// ─── Message action buttons ───────────────────────────────────────────────────
function MessageActions({
  message,
  onRegenerate,
  onSpeak,
}: {
  message: Message;
  onRegenerate?: () => void;
  onSpeak?: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
      <button
        onClick={handleCopy}
        className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/8 transition-all"
        title="Copy"
      >
        {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
      </button>
      {onRegenerate && (
        <button
          onClick={onRegenerate}
          className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/8 transition-all"
          title="Regenerate"
        >
          <RefreshCw size={13} />
        </button>
      )}
    </div>
  );
}

// ─── Typing indicator ─────────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="flex items-center gap-2 py-3 px-4">
      <div className="flex items-center gap-1.5">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="w-2 h-2 rounded-full bg-blue-400 typing-dot"
            style={{ animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </div>
      <span className="text-[11px] text-white/40 font-mono uppercase tracking-wider">
        AI Verse is thinking...
      </span>
    </div>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────
function ChatHeader({
  onClear,
  onToggleTheme,
  theme,
}: {
  onClear: () => void;
  onToggleTheme: () => void;
  theme: string;
}) {
  const router = useRouter();
  return (
    <div className="h-14 px-4 md:px-6 flex items-center justify-between border-b border-white/8 bg-(--bg-secondary)/50 backdrop-blur-xl shrink-0 z-30">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-linear-to-br from-red-600 to-red-800 flex items-center justify-center shadow-lg">
          <Cpu size={14} className="text-white" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-white tracking-wide font-display">AI VERSE</h1>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[10px] text-white/40 uppercase tracking-widest font-mono">Online</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onClear}
          className="p-2 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/8 transition-all"
          title="Clear chat"
        >
          <Trash2 size={15} />
        </button>
        <button
          onClick={onToggleTheme}
          className="p-2 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/8 transition-all"
          title="Toggle theme"
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>
        <button
          onClick={() => router.push('/settings')}
          className="p-2 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/8 transition-all"
          title="Settings"
        >
          <Settings size={15} />
        </button>
      </div>
    </div>
  );
}

// ─── File attachment preview ──────────────────────────────────────────────────
function AttachmentPreview({
  attachment,
  onRemove,
}: {
  attachment: FileAttachment;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-white/8 rounded-xl border border-white/10 max-w-xs">
      <div className="w-7 h-7 rounded-lg bg-blue-600/30 flex items-center justify-center shrink-0">
        {attachment.type === 'image' ? '🖼️' : '📄'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-white/90 truncate">{attachment.name}</p>
        <p className="text-[10px] text-white/40 capitalize">{attachment.type}</p>
      </div>
      <button onClick={onRemove} className="text-white/30 hover:text-red-400 transition-colors shrink-0">
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

const WELCOME_MSG: Message = {
  id: 'welcome',
  role: 'assistant',
  content: `Hello! I'm **AI Verse** — your intelligent AI workspace created by Lokesh. I can help you with:

- 💻 **Programming** — code generation, debugging, review
- ✍️ **Writing** — essays, emails, creative content
- 🔬 **Research** — analysis, explanations, summaries
- 📊 **Data** — CSV analysis, statistics, charts
- 🌐 **Web Search** — real-time information
- 🖼️ **Vision** — image understanding, OCR
- 🎙️ **Voice** — speak to me naturally

What can I help you with today?`,
  timestamp: new Date(),
};

export default function ChatInterface({
  onLoadingChange,
  onTalkingChange,
  onListeningChange,
}: ChatInterfaceProps) {
  const { settings, updateSettings } = useSettings();
  const [messages, setMessages] = useState<Message[]>([WELCOME_MSG]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [attachment, setAttachment] = useState<FileAttachment | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const voiceRef = useRef(typeof window !== 'undefined' ? getVoiceAssistant() : null);

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

  // Show/hide scroll-to-bottom button
  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 100);
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 150) + 'px';
    }
  }, [input]);

  // ── Core send handler ───────────────────────────────────────────────────────
  const handleSend = useCallback(async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text && !attachment) return;
    if (isLoading) return;

    // Clear input immediately
    setInput('');
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
      // Build messages payload — limit history to last 20 to reduce tokens
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

      // Finalize
      setMessages(prev =>
        prev.map(m => m.id === aiId ? { ...m, content: accum, isStreaming: false } : m)
      );

    } catch (err: any) {
      if (err.name === 'AbortError') {
        // Stopped by user — finalize whatever was accumulated
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
    // Find last user message
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
    if (!lastUserMsg) return;
    // Remove last AI message and resend
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
    setMessages([WELCOME_MSG]);
    setAttachment(null);
    setInput('');
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
    <div className="flex flex-col h-full w-full">
      {/* Header */}
      <ChatHeader
        onClear={handleClear}
        onToggleTheme={handleToggleTheme}
        theme={settings.theme}
      />

      {/* Messages area */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto chat-scroll px-4 md:px-6 py-6 space-y-6"
      >
        {/* Welcome suggestions */}
        {messages.length === 1 && messages[0].id === 'welcome' && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="max-w-3xl mx-auto mt-4"
          >
            {/* Welcome message */}
            <div className="mb-8">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-linear-to-br from-red-600 to-red-800 flex items-center justify-center shrink-0 mt-0.5 shadow-lg">
                  <Cpu size={14} className="text-white" />
                </div>
                <div className="glass rounded-2xl rounded-tl-sm px-5 py-4 max-w-2xl">
                  <MarkdownRenderer content={WELCOME_MSG.content} />
                </div>
              </div>
            </div>

            {/* Suggestion grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {SUGGESTIONS.map((s, i) => (
                <motion.button
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + i * 0.05 }}
                  onClick={() => handleSend(s.text)}
                  className="glass rounded-xl p-3 text-left hover:border-blue-500/30 hover:bg-white/8 transition-all group"
                >
                  <div className="text-lg mb-1">{s.icon}</div>
                  <p className="text-xs font-medium text-white/80 group-hover:text-white transition-colors leading-snug">
                    {s.text}
                  </p>
                  <p className="text-[10px] text-white/30 mt-0.5 uppercase tracking-wide">{s.category}</p>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Messages */}
        {messages
          .filter(m => m.id !== 'welcome' || messages.length > 1)
          .map((msg, idx) => {
          const isUser = msg.role === 'user';
          const isLastAI = !isUser && idx === messages.length - 1;

          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`max-w-3xl mx-auto flex ${isUser ? 'justify-end' : 'justify-start'} group`}
            >
              {!isUser && (
                <div className="w-8 h-8 rounded-lg bg-linear-to-br from-red-600 to-red-800 flex items-center justify-center shrink-0 mt-0.5 mr-3 shadow-md">
                  <Cpu size={13} className="text-white" />
                </div>
              )}

              <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[85%] md:max-w-[75%]`}>
                {/* Attachment preview (in user message) */}
                {isUser && msg.attachment && (
                  <div className="mb-2">
                    {msg.attachment.type === 'image' ? (
                      <img
                        src={msg.attachment.data}
                        alt={msg.attachment.name}
                        className="rounded-xl max-w-xs border border-white/10 shadow-lg"
                      />
                    ) : (
                      <div className="flex items-center gap-2 px-3 py-2 bg-white/8 rounded-xl border border-white/10 text-xs text-white/60">
                        📄 {msg.attachment.name}
                      </div>
                    )}
                  </div>
                )}

                {/* Message bubble */}
                <div
                  className={`rounded-2xl px-4 py-3 ${
                    isUser
                      ? 'bg-linear-to-br from-red-600 to-red-700 text-white rounded-tr-sm shadow-lg shadow-red-900/20'
                      : 'glass rounded-tl-sm'
                  } ${msg.isError ? 'border-red-500/30 bg-red-900/10' : ''}`}
                >
                  {isUser ? (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  ) : msg.content ? (
                    <MarkdownRenderer content={msg.content} isStreaming={msg.isStreaming} />
                  ) : msg.isStreaming ? null : (
                    <p className="text-white/40 text-sm italic">Empty response</p>
                  )}

                  {/* Typing indicator inside bubble */}
                  {!isUser && msg.isStreaming && !msg.content && <TypingIndicator />}
                </div>

                {/* Timestamp */}
                <p className="text-[10px] text-white/20 mt-1 px-1">
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>

                {/* Action buttons for AI messages */}
                {!isUser && !msg.isStreaming && (
                  <MessageActions
                    message={msg}
                    onRegenerate={isLastAI ? handleRegenerate : undefined}
                  />
                )}
              </div>
            </motion.div>
          );
        })}

        {/* Standalone typing indicator when loading starts */}
        {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
          <div className="max-w-3xl mx-auto flex justify-start">
            <div className="w-8 h-8 rounded-lg bg-linear-to-br from-red-600 to-red-800 flex items-center justify-center mr-3 mt-0.5">
              <Cpu size={13} className="text-white" />
            </div>
            <div className="glass rounded-2xl rounded-tl-sm px-4 py-3">
              <TypingIndicator />
            </div>
          </div>
        )}
      </div>

      {/* Scroll to bottom */}
      <AnimatePresence>
        {showScrollBtn && (
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            onClick={() => scrollToBottom()}
            className="absolute bottom-28 right-6 p-2.5 glass rounded-full shadow-xl text-white/60 hover:text-white transition-all z-20"
          >
            <ChevronDown size={16} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Camera vision */}
      <AnimatePresence>
        {showCamera && (
          <DynamicCameraVision
            onClose={() => setShowCamera(false)}
            onCaptureImage={handleCameraCapture}
            onOCRResult={handleOCRResult}
          />
        )}
      </AnimatePresence>

      {/* Input area */}
      <div className="shrink-0 px-4 md:px-6 pb-5 pt-3 bg-linear-to-t from-(--bg) via-(--bg) to-transparent">
        {/* Attachment preview */}
        <AnimatePresence>
          {attachment && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="mb-3 max-w-3xl mx-auto"
            >
              <AttachmentPreview attachment={attachment} onRemove={() => setAttachment(null)} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input bar */}
        <div className="max-w-3xl mx-auto input-bar">
          <div className="flex items-end gap-1 p-2">
            {/* Left tools */}
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
                className="p-2.5 rounded-xl text-white/40 hover:text-white/80 hover:bg-white/8 transition-all"
                title="Attach file"
              >
                <Paperclip size={17} />
              </button>
              <button
                onClick={() => setShowCamera(true)}
                className="p-2.5 rounded-xl text-white/40 hover:text-white/80 hover:bg-white/8 transition-all"
                title="Camera / Vision"
              >
                <Camera size={17} />
              </button>
            </div>

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              placeholder="Ask me anything... (Shift+Enter for newline)"
              rows={1}
              className="flex-1 bg-transparent border-none outline-none resize-none text-[15px] text-white/90 placeholder:text-white/25 leading-relaxed py-2.5 px-1 max-h-37.5 scrollbar-hide"
              style={{ fontFamily: 'Inter, sans-serif' }}
            />

            {/* Right tools */}
            <div className="flex items-center gap-0.5 shrink-0 pb-1">
              <button
                onClick={handleVoice}
                disabled={isLoading}
                className={`p-2.5 rounded-xl transition-all ${
                  isListening
                    ? 'bg-red-600 text-white animate-pulse'
                    : 'text-white/40 hover:text-white/80 hover:bg-white/8'
                } disabled:opacity-40`}
                title={isListening ? 'Listening...' : 'Voice input'}
              >
                {isListening ? <MicOff size={17} /> : <Mic size={17} />}
              </button>

              {isLoading ? (
                <button
                  onClick={handleStop}
                  className="p-2.5 rounded-xl bg-red-600/80 hover:bg-red-600 text-white transition-all"
                  title="Stop generation"
                >
                  <StopCircle size={17} />
                </button>
              ) : (
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim() && !attachment}
                  className="p-2.5 rounded-xl bg-linear-to-br from-red-600 to-red-700 text-white shadow-lg shadow-red-900/30 hover:shadow-red-900/50 hover:scale-105 transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed disabled:scale-100 disabled:shadow-none"
                  title="Send (Enter)"
                >
                  <Send size={17} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Bottom hint */}
        <p className="text-center text-[11px] text-white/15 mt-2 max-w-3xl mx-auto">
          AI Verse may make mistakes. Verify important information. · Made by Lokesh
        </p>
      </div>
    </div>
  );
}
