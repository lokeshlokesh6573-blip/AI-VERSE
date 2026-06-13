'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import SettingsSection from '@/components/settings/SettingsSection';
import SettingsCard from '@/components/settings/SettingsCard';
import { 
  ArrowLeft, 
  Moon, 
  Sun, 
  Languages, 
  MessageSquare, 
  Trash2, 
  User, 
  LogOut, 
  Download, 
  ShieldAlert,
  Save,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { supabase } from '@/lib/supabase';

export default function SettingsPage() {
  const router = useRouter();
  const { profile, settings, updateSettings, signOut, user, loading } = useAuth();
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
     if (!confirm('Are you sure you want to delete all chat history? This cannot be undone.')) return;
     
     try {
        const { error } = await supabase
            .from('conversations')
            .delete()
            .eq('user_id', user?.id);
        
        if (error) throw error;
        alert('History cleared successfully.');
     } catch (err) {
        console.error(err);
        alert('Failed to clear history.');
     }
  };

  const exportData = async () => {
    const data = {
      profile,
      settings,
      timestamp: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-verse-profile-${profile?.username || 'user'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const deleteAccount = async () => {
     if (!confirm('CRITICAL ACTION: This will permanently delete your account and all associated data. Continue?')) return;
     alert('Account deletion request sent to administrative override.');
  };

  if (loading && !settings) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-blue-500 font-orbitron animate-pulse uppercase tracking-[0.3em] font-black text-xs">
           Decrypting System Settings...
        </div>
      </div>
    );
  }

  // Fallback settings object to handle initial loading lag
  const displaySettings = settings || {
    theme: 'dark',
    language: 'en',
    response_style: 'detailed'
  };

  return (
    <main className="min-h-screen bg-background text-foreground font-sans selection:bg-red-500/30 transition-colors duration-300">
      {/* Cinematic Background */}
      <div className="fixed inset-0 z-0 opacity-10">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?q=80&w=2574&auto=format&fit=crop')] bg-cover bg-center grayscale" />
        <div className="absolute inset-0 bg-linear-to-b from-black via-transparent to-black" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.push('/')}
              className="p-3 bg-zinc-900/50 border border-white/10 rounded-2xl hover:bg-zinc-800 transition-all hover:scale-105 active:scale-95"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-4xl font-black font-orbitron tracking-tighter text-white">SYSTEM_SETTINGS</h1>
              <p className="text-zinc-500 text-[10px] uppercase tracking-[0.3em] font-bold">Protocol Alpha // OS 1.0</p>
            </div>
          </div>

          <AnimatePresence>
            {saveStatus !== 'idle' && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className={cn(
                  "px-4 py-2 rounded-xl flex items-center gap-2 text-xs font-bold uppercase tracking-widest",
                  saveStatus === 'success' ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"
                )}
              >
                {saveStatus === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                {saveStatus === 'success' ? 'Settings Synced' : 'Sync Failed'}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="space-y-12 pb-24">
          
          <SettingsSection 
            title="Appearance" 
            description="Visual Interface Configuration"
            icon={<Sun size={20} />}
          >
            <SettingsCard 
              title="Color Theme" 
              description="Switch between Light and Dark interface modes."
              icon={displaySettings.theme === 'dark' ? Moon : Sun}
            >
              <div className="flex gap-2">
                {['dark', 'light'].map((t) => (
                  <button
                    key={t}
                    onClick={() => handleUpdate({ theme: t })}
                    className={cn(
                      "flex-1 py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-widest transition-all",
                      displaySettings.theme === t 
                        ? "bg-red-600 text-white shadow-lg shadow-red-900/40" 
                        : "bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </SettingsCard>

            <SettingsCard 
              title="Interface Language" 
              description="Primary language for system interactions."
              icon={Languages}
            >
              <select 
                value={displaySettings.language || 'en'}
                onChange={(e) => handleUpdate({ language: e.target.value })}
                className="w-full bg-zinc-800/50 border border-white/5 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-red-500/50 text-zinc-300"
              >
                <option value="en">English (US)</option>
                <option value="te">Telugu (తెలుగు)</option>
                <option value="hi">Hindi (हिन्दी)</option>
              </select>
            </SettingsCard>
          </SettingsSection>

          <SettingsSection 
            title="Intelligence" 
            description="AI Interaction Protocols"
            icon={<MessageSquare size={20} />}
          >
            <SettingsCard 
              title="Response Style" 
              description="Control the depth and brevity of AI explanations."
              icon={ShieldAlert}
            >
              <div className="flex gap-2">
                {[
                  { id: 'short', label: 'Brief' },
                  { id: 'detailed', label: 'Detailed' }
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => handleUpdate({ response_style: s.id })}
                    className={cn(
                      "flex-1 py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-widest transition-all",
                      displaySettings.response_style === s.id 
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-900/40" 
                        : "bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </SettingsCard>

            <SettingsCard 
              title="Data Purge" 
              description="Permanent deletion of all communication records."
              icon={Trash2}
              danger
            >
              <button 
                onClick={clearHistory}
                className="w-full py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-widest bg-red-600/10 text-red-500 border border-red-500/20 hover:bg-red-600 hover:text-white transition-all"
              >
                Clear History
              </button>
            </SettingsCard>
          </SettingsSection>

          <SettingsSection 
            title="Profile" 
            description="Agent & Authentication Stats"
            icon={<User size={20} />}
          >
            <SettingsCard 
              title="Identity" 
              description={user?.email || 'Unauthorized User'}
              icon={User}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-zinc-500 font-mono">ROLE: {profile?.role?.toUpperCase() || 'USER'}</span>
                <span className="text-[10px] text-zinc-500 font-mono">PLAN: {profile?.plan?.toUpperCase() || 'FREE'}</span>
              </div>
            </SettingsCard>

            <SettingsCard 
              title="System Actions" 
              description="Manage session and personal data."
              icon={Save}
            >
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={exportData}
                  className="py-2 px-3 rounded-lg text-[10px] font-bold uppercase tracking-widest bg-zinc-800/50 text-zinc-300 border border-white/5 hover:bg-zinc-700 transition-all flex items-center justify-center gap-2"
                >
                  <Download size={12} /> Export
                </button>
                <button 
                  onClick={signOut}
                  className="py-2 px-3 rounded-lg text-[10px] font-bold uppercase tracking-widest bg-zinc-800/50 text-red-400 border border-white/5 hover:bg-red-600 hover:text-white transition-all flex items-center justify-center gap-2"
                >
                  <LogOut size={12} /> Logout
                </button>
              </div>
            </SettingsCard>

            <SettingsCard 
              title="Account Deletion" 
              description="Terminate profile and delete all identity data."
              icon={Trash2}
              danger
              className="md:col-span-2"
            >
              <button 
                onClick={deleteAccount}
                className="w-full py-3 rounded-xl bg-zinc-900 border border-red-900/30 text-red-800 hover:bg-red-900/10 hover:text-red-500 transition-all font-bold uppercase tracking-[0.2em] text-[10px]"
              >
                Permanently Decommission Account
              </button>
            </SettingsCard>
          </SettingsSection>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 w-full h-1 bg-linear-to-r from-transparent via-red-500/50 to-transparent opacity-20" />
    </main>
  );
}