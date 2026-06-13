'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Settings as SettingsIcon, 
  Moon, 
  Sun, 
  Languages, 
  Cpu, 
  ShieldAlert, 
  Trash2, 
  User, 
  LogOut, 
  Download,
  Save,
  CheckCircle2,
  AlertCircle,
  Zap,
  Globe
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/utils/cn';
import { supabase } from '@/lib/supabase';
import SettingsSection from './SettingsSection';
import SettingsCard from './SettingsCard';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const { profile, settings, updateSettings, signOut, user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleUpdate = async (newSettings: any) => {
    setSaving(true);
    setSaveStatus('idle');
    try {
      await updateSettings(newSettings);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err) {
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  };

  const clearHistory = async () => {
     if (!confirm('Are you sure you want to delete all chat history?')) return;
     try {
        const { error } = await supabase.from('conversations').delete().eq('user_id', user?.id);
        if (error) throw error;
        alert('History purged.');
     } catch (err) {
        console.error(err);
        alert('Failed to clear history.');
     }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4 sm:p-6 md:p-12">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
      />

      {/* Panel */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-4xl h-[85vh] bg-zinc-950 border border-white/10 rounded-[2.5rem] overflow-hidden flex flex-col shadow-[0_0_50px_-12px_rgba(220,38,38,0.3)]"
      >
        {/* Cinematic Header */}
        <div className="flex items-center justify-between p-8 border-b border-white/5 bg-zinc-900/20">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-600/10 rounded-2xl border border-red-500/20 text-red-500">
              <SettingsIcon size={24} className="animate-[spin_4s_linear_infinite]" />
            </div>
            <div>
              <h1 className="text-2xl font-black font-orbitron tracking-tighter text-white uppercase">System_Override</h1>
              <p className="text-[9px] text-zinc-500 font-bold tracking-[0.3em] uppercase">Protocol Alpha // AI Verse v3.1</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {/* Save Status */}
            <AnimatePresence mode="wait">
              {saveStatus !== 'idle' && (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className={cn(
                    "px-3 py-1.5 rounded-full flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest border",
                    saveStatus === 'success' ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"
                  )}
                >
                  {saveStatus === 'success' ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                  {saveStatus === 'success' ? 'Synced' : 'Error'}
                </motion.div>
              )}
            </AnimatePresence>

            <button 
              onClick={onClose}
              className="p-3 hover:bg-white/5 rounded-full transition-colors text-zinc-500 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-12 scrollbar-hide">
          
          {/* Intelligence & Model */}
          <SettingsSection 
            title="Core_Intelligence" 
            description="Neural Link Protocols"
            icon={<Cpu size={18} />}
          >
            <SettingsCard 
              title="Active Model" 
              description="Primary neural architecture for responses."
              icon={Zap}
              className="md:col-span-2"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 (High)', provider: 'Groq' },
                  { id: 'google/gemini-2.0-flash-001', label: 'Gemini 2.0', provider: 'OpenRouter' },
                  { id: 'google/gemini-flash-1.5', label: 'Gemini 1.5 Flash', provider: 'OpenRouter' }
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => handleUpdate({ model: m.id })}
                    className={cn(
                      "group relative p-4 rounded-2xl border text-left transition-all",
                      settings?.model === m.id 
                        ? "bg-red-600/10 border-red-500/50" 
                        : "bg-zinc-900/50 border-white/5 hover:border-white/20"
                    )}
                  >
                    <div className="flex flex-col">
                      <span className={cn(
                        "text-[10px] font-bold uppercase tracking-widest mb-1",
                        settings?.model === m.id ? "text-red-400" : "text-zinc-500"
                      )}>{m.provider}</span>
                      <span className="text-xs font-black text-white">{m.label}</span>
                    </div>
                    {settings?.model === m.id && (
                      <div className="absolute top-2 right-2">
                        <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </SettingsCard>

            <SettingsCard 
              title="Response Protocol" 
              description="Verbosity of agent output."
              icon={ShieldAlert}
            >
              <div className="flex gap-2 p-1 bg-zinc-900/80 rounded-xl border border-white/5">
                {['short', 'detailed'].map((s) => (
                  <button
                    key={s}
                    onClick={() => handleUpdate({ response_style: s })}
                    className={cn(
                      "flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                      settings?.response_style === s 
                        ? "bg-white text-black shadow-lg" 
                        : "text-zinc-500 hover:text-white"
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </SettingsCard>

            <SettingsCard 
              title="Data Purge" 
              description="Erase all local/cloud records."
              icon={Trash2}
              danger
            >
              <button 
                onClick={clearHistory}
                className="w-full py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-red-600/10 text-red-500 border border-red-500/20 hover:bg-red-600 hover:text-white transition-all"
              >
                Clear History
              </button>
            </SettingsCard>
          </SettingsSection>

          {/* Appearance */}
          <SettingsSection 
            title="Interface" 
            description="Visual HUD Calibration"
            icon={<Sun size={18} />}
          >
            <SettingsCard 
              title="Spectral Theme" 
              description="System-wide color calibration."
              icon={settings?.theme === 'dark' ? Moon : Sun}
            >
              <div className="flex gap-2 p-1 bg-zinc-900/80 rounded-xl border border-white/5">
                {['dark', 'light'].map((t) => (
                  <button
                    key={t}
                    onClick={() => handleUpdate({ theme: t })}
                    className={cn(
                      "flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                      settings?.theme === t 
                        ? "bg-zinc-100 text-black" 
                        : "text-zinc-500 hover:text-white"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </SettingsCard>

            <SettingsCard 
              title="Linguistic Link" 
              description="Primary interaction language."
              icon={Globe}
            >
              <select 
                value={settings?.language}
                onChange={(e) => handleUpdate({ language: e.target.value })}
                className="w-full bg-zinc-900 border border-white/10 rounded-xl py-2.5 px-4 text-xs font-bold focus:outline-none focus:border-red-500/50 text-white appearance-none cursor-pointer"
              >
                <option value="en">English (US)</option>
                <option value="te">Telugu (తెలుగు)</option>
                <option value="hi">Hindi (हिन्दी)</option>
              </select>
            </SettingsCard>
          </SettingsSection>

          {/* Account */}
          <SettingsSection 
            title="Agent_Profile" 
            description="Biometric Status"
            icon={<User size={18} />}
          >
            <SettingsCard 
              title="Verified Identity" 
              description={user?.email || 'Unauthorized'}
              icon={User}
            >
              <div className="flex items-center justify-between px-1">
                <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-tighter">ROLE: {profile?.role || 'User'}</span>
                <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-tighter">STATUS: ACTIVE</span>
              </div>
            </SettingsCard>

            <SettingsCard 
              title="System Actions" 
              description="Manage cloud connectivity."
              icon={LogOut}
            >
              <button 
                onClick={signOut}
                className="w-full py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-zinc-900 border border-red-500/20 text-red-500 hover:bg-red-600 hover:text-white transition-all flex items-center justify-center gap-2"
              >
                <LogOut size={12} /> Logout System
              </button>
            </SettingsCard>
          </SettingsSection>

        </div>

        {/* Footer HUD */}
        <div className="p-6 bg-zinc-900/40 border-t border-white/5 flex items-center justify-between">
           <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-[0.2em]">All Systems Nominal</span>
           </div>
           <div className="flex space-x-2">
              <div className="w-12 h-1 bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ x: '-100%' }}
                  animate={{ x: '100%' }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  className="w-full h-full bg-red-500"
                />
              </div>
           </div>
        </div>
      </motion.div>
    </div>
  );
}
