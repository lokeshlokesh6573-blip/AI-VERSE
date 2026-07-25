'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

export type Theme = 'dark' | 'light';
export type ResponseStyle = 'concise' | 'detailed';

export interface AppSettings {
  theme: Theme;
  language: string;
  responseStyle: ResponseStyle;
  model: string;
  temperature: number;
  maxTokens: number;
  voiceEnabled: boolean;
  voiceRate: number;
  voicePitch: number;
}

const DEFAULTS: AppSettings = {
  theme: 'dark',
  language: 'en',
  responseStyle: 'detailed',
  model: 'llama-3.3-70b-versatile',
  temperature: 0.7,
  maxTokens: 2048,
  voiceEnabled: true,
  voiceRate: 1.0,
  voicePitch: 1.0,
};

interface SettingsContextType {
  settings: AppSettings;
  updateSettings: (patch: Partial<AppSettings>) => void;
  resetSettings: () => void;
}

const SettingsContext = createContext<SettingsContextType>({
  settings: DEFAULTS,
  updateSettings: () => {},
  resetSettings: () => {},
});

export const SettingsProvider = ({ children }: { children: React.ReactNode }) => {
  const [settings, setSettings] = useState<AppSettings>(DEFAULTS);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('ai_verse_settings');
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<AppSettings>;
        const merged = { ...DEFAULTS, ...parsed };
        setSettings(merged);
        applyTheme(merged.theme);
      } else {
        applyTheme(DEFAULTS.theme);
      }
    } catch {
      applyTheme(DEFAULTS.theme);
    }
  }, []);

  const applyTheme = (theme: Theme) => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem('ai_verse_settings', JSON.stringify(next));
      } catch {}
      if (patch.theme) applyTheme(patch.theme);
      return next;
    });
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULTS);
    try {
      localStorage.removeItem('ai_verse_settings');
    } catch {}
    applyTheme(DEFAULTS.theme);
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, resetSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext);
