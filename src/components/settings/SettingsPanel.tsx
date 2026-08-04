'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Settings as SettingsIcon, 
  Moon, 
  Sun, 
  Trash2, 
  CheckCircle2,
  Zap,
  Sliders,
  Volume2
} from 'lucide-react';
import { useSettings } from '@/context/SettingsContext';
import { AI_MODELS } from '@/types';
import { cn } from '@/utils/cn';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const { settings, updateSettings, resetSettings } = useSettings();
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success'>('idle');

  if (!isOpen) return null;

  const handleUpdate = (patch: Parameters<typeof updateSettings>[0]) => {
    updateSettings(patch);
    setSaveStatus('success');
    setTimeout(() => setSaveStatus('idle'), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-12">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 dark:bg-black/70 backdrop-blur-md"
      />

      {/* Panel */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative w-full max-w-3xl h-[85vh] bg-(--bg-secondary) border border-(--border) rounded-3xl overflow-hidden flex flex-col shadow-2xl z-10"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-(--border)">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-600/10 rounded-2xl border border-red-500/20 text-red-500">
              <SettingsIcon size={22} className="animate-[spin_6s_linear_infinite]" />
            </div>
            <div>
              <h1 className="text-xl font-bold font-display tracking-wide text-(--text-primary)">System Settings</h1>
              <p className="text-[11px] text-(--text-muted) font-mono uppercase tracking-widest">AI Verse Configuration</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <AnimatePresence>
              {saveStatus === 'success' && (
                <motion.div 
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="px-3 py-1 rounded-full flex items-center gap-1.5 text-[11px] font-mono bg-green-500/10 text-green-500 border border-green-500/20"
                >
                  <CheckCircle2 size={13} /> Saved
                </motion.div>
              )}
            </AnimatePresence>

            <button 
              onClick={onClose}
              className="p-2.5 hover:bg-(--bg-card) rounded-full transition-colors text-(--text-muted) hover:text-(--text-primary)"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 scrollbar-hide">
          
          {/* Section: AI Model Selection */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Zap size={16} className="text-blue-500" />
              <h2 className="text-sm font-bold text-(--text-primary) uppercase tracking-wider font-mono">Core Intelligence Model</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {AI_MODELS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => handleUpdate({ model: m.id })}
                  className={cn(
                    "p-4 rounded-2xl border text-left transition-all relative flex flex-col gap-2.5",
                    settings.model === m.id 
                      ? "bg-blue-600/10 border-blue-500/50 shadow-lg shadow-blue-900/10" 
                      : "bg-(--bg-card) border-(--border) hover:border-(--text-muted)"
                  )}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-(--text-primary)">{m.name}</span>
                      {m.badge && (
                        <span className="px-1.5 py-0.5 rounded-full text-[9px] font-mono bg-blue-500/15 text-blue-400 border border-blue-500/30">
                          {m.badge}
                        </span>
                      )}
                    </div>
                    {m.supportsVision && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-mono bg-purple-500/20 text-purple-500 border border-purple-500/30">
                        Vision
                      </span>
                    )}
                  </div>

                  {/* Speed + Intelligence meters */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-(--text-muted) font-mono uppercase tracking-wider">Speed</span>
                        <span className="text-[10px] font-mono text-blue-500">{m.speed}/5</span>
                      </div>
                      <div className="flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <div
                            key={i}
                            className={cn(
                              "h-1 flex-1 rounded-full",
                              i < m.speed ? "bg-blue-500" : "bg-(--bg-input)"
                            )}
                          />
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-(--text-muted) font-mono uppercase tracking-wider">IQ</span>
                        <span className="text-[10px] font-mono text-purple-500">{m.intelligence}/5</span>
                      </div>
                      <div className="flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <div
                            key={i}
                            className={cn(
                              "h-1 flex-1 rounded-full",
                              i < m.intelligence ? "bg-purple-500" : "bg-(--bg-input)"
                            )}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <p className="text-[11px] text-(--text-secondary) leading-relaxed">{m.useCase}</p>

                  <div className="flex items-center justify-between border-t border-(--border) pt-2">
                    <span className="text-[10px] font-mono text-(--text-muted) uppercase tracking-wider">
                      {m.contextWindow >= 100000 ? `${Math.round(m.contextWindow / 1000)}k ctx` : `${Math.round(m.contextWindow / 1000)}k ctx`}
                    </span>
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[9px] font-mono border",
                      m.cost === 'Free'
                        ? "bg-green-500/10 text-green-500 border-green-500/25"
                        : "bg-amber-500/10 text-amber-500 border-amber-500/25"
                    )}>
                      {m.cost}
                    </span>
                  </div>

                  {settings.model === m.id && (
                    <div className="absolute top-3 right-3 w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Section: Generation Parameters */}
          <div className="border-t border-(--border) pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Sliders size={16} className="text-purple-500" />
              <h2 className="text-sm font-bold text-(--text-primary) uppercase tracking-wider font-mono">Response Parameters</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Response Style */}
              <div className="bg-(--bg-card) p-4 rounded-2xl border border-(--border)">
                <label className="text-xs font-semibold text-(--text-secondary) block mb-2">Response Verbosity</label>
                <div className="flex gap-2 p-1 bg-(--bg-input) rounded-xl border border-(--border)">
                  {(['concise', 'detailed'] as const).map((style) => (
                    <button
                      key={style}
                      onClick={() => handleUpdate({ responseStyle: style })}
                      className={cn(
                        "flex-1 py-2 rounded-lg text-xs font-medium capitalize transition-all",
                        settings.responseStyle === style 
                          ? "bg-(--text-primary) text-(--bg) font-semibold shadow-md" 
                          : "text-(--text-muted) hover:text-(--text-primary)"
                      )}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>

              {/* Temperature */}
              <div className="bg-(--bg-card) p-4 rounded-2xl border border-(--border)">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-(--text-secondary)">Creativity (Temperature)</label>
                  <span className="text-xs font-mono text-blue-500">{settings.temperature}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={settings.temperature}
                  onChange={(e) => handleUpdate({ temperature: parseFloat(e.target.value) })}
                  className="w-full accent-blue-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-(--text-muted) font-mono mt-1">
                  <span>Precise</span>
                  <span>Creative</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section: Appearance & Audio */}
          <div className="border-t border-(--border) pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Sun size={16} className="text-amber-500" />
              <h2 className="text-sm font-bold text-(--text-primary) uppercase tracking-wider font-mono">Appearance & Audio</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Theme */}
              <div className="bg-(--bg-card) p-4 rounded-2xl border border-(--border) flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-(--text-primary)">Interface Theme</p>
                  <p className="text-[11px] text-(--text-muted)">Dark or light aesthetic</p>
                </div>
                <button
                  onClick={() => handleUpdate({ theme: settings.theme === 'dark' ? 'light' : 'dark' })}
                  className="p-2.5 bg-(--bg-input) hover:bg-(--bg-card) rounded-xl border border-(--border) text-(--text-primary) transition-all"
                >
                  {settings.theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
                </button>
              </div>

              {/* Voice */}
              <div className="bg-(--bg-card) p-4 rounded-2xl border border-(--border) flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-(--text-primary)">Voice Assistant</p>
                  <p className="text-[11px] text-(--text-muted)">Enable text-to-speech output</p>
                </div>
                <button
                  onClick={() => handleUpdate({ voiceEnabled: !settings.voiceEnabled })}
                  className={cn(
                    "p-2.5 rounded-xl border transition-all",
                    settings.voiceEnabled 
                      ? "bg-blue-600/20 text-blue-500 border-blue-500/40" 
                      : "bg-(--bg-input) text-(--text-muted) border-(--border)"
                  )}
                >
                  <Volume2 size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Section: Reset */}
          <div className="border-t border-(--border) pt-6 flex justify-between items-center">
            <div>
              <p className="text-xs font-semibold text-(--text-secondary)">Reset Preferences</p>
              <p className="text-[11px] text-(--text-muted)">Restore all settings to default values</p>
            </div>
            <button
              onClick={() => {
                resetSettings();
                handleUpdate({});
              }}
              className="px-4 py-2 bg-(--bg-input) hover:bg-red-500/10 hover:text-red-500 border border-(--border) rounded-xl text-xs text-(--text-secondary) font-mono transition-all"
            >
              Reset Defaults
            </button>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 px-6 border-t border-(--border) flex items-center justify-between">
          <span className="text-[11px] text-(--text-muted) font-mono">AI Verse v3.2 · Local Preference Storage</span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-red-900/30"
          >
            Done
          </button>
        </div>
      </motion.div>
    </div>
  );
}
