'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Plus, MessageSquare, Trash2, Clock, ShieldCheck } from 'lucide-react';

interface Conversation {
  id: string;
  title: string;
  updated_at: string;
}

interface ChatSidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}

export default function ChatSidebar({ conversations, activeId, onSelect, onNew, onDelete }: ChatSidebarProps) {
  return (
    <div className="w-72 h-full glass border-r border-white/5 flex flex-col items-stretch p-4 space-y-6">
      <div className="flex items-center justify-between px-2">
        <div className="flex flex-col">
          <span className="text-[10px] text-red-500 tracking-[0.3em] font-black uppercase">Archived</span>
          <span className="text-white font-orbitron text-xs font-black tracking-widest">SIGNALS</span>
        </div>
        <ShieldCheck className="w-4 h-4 text-blue-500" />
      </div>

      <button
        onClick={onNew}
        className="w-full py-3 bg-red-600/10 hover:bg-red-600/20 border border-red-500/20 rounded-xl flex items-center justify-center gap-2 text-white text-[10px] uppercase font-black tracking-widest transition-all active:scale-95 group"
      >
        <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
        New Protocol
      </button>

      <div className="flex-1 overflow-y-auto space-y-2 pr-2 scrollbar-hide">
        {conversations.map((conv) => (
          <motion.div
            key={conv.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className={`group relative p-3 rounded-xl border transition-all cursor-pointer ${
              activeId === conv.id
                ? 'bg-blue-600/10 border-blue-500/30'
                : 'bg-white/5 border-transparent hover:border-white/10'
            }`}
            onClick={() => onSelect(conv.id)}
          >
            <div className="flex items-start gap-3">
              <MessageSquare className={`w-4 h-4 mt-1 ${activeId === conv.id ? 'text-blue-400' : 'text-zinc-500'}`} />
              <div className="flex-1 overflow-hidden">
                <p className={`text-xs font-bold truncate ${activeId === conv.id ? 'text-white' : 'text-zinc-400'}`}>
                  {conv.title}
                </p>
                <p className="text-[8px] text-zinc-600 uppercase tracking-tighter mt-1 flex items-center gap-1">
                  <Clock size={8} />
                  {new Date(conv.updated_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(conv.id);
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-zinc-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all hover:scale-110"
            >
              <Trash2 size={12} />
            </button>
          </motion.div>
        ))}
      </div>

      <div className="pt-4 border-t border-white/5">
        <p className="text-[8px] text-zinc-500 text-center uppercase tracking-widest font-bold">
          System Encryption Active
        </p>
      </div>
    </div>
  );
}
