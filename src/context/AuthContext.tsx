'use client';

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { User, Session } from '@supabase/supabase-js';

type Profile = {
  id: string;
  username: string | null;
  email: string | null;
  avatar_url: string | null;
  role: string;
  plan: string;
};

type UserSettings = {
  theme: string;
  language: string;
  response_style: string;
  model: string;
};

type AuthContextType = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  settings: UserSettings | null;
  loading: boolean;
  signOut: () => Promise<void>;
  updateSettings: (newSettings: Partial<UserSettings>) => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  settings: null,
  loading: true,
  signOut: async () => { },
  updateSettings: async () => { },
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchingUserId = useRef<string | null>(null);

  useEffect(() => {
    const initializeAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        await fetchUserData(session.user.id);
      } else {
        setLoading(false);
      }
    };

    initializeAuth();
    // Initial sync from localStorage to prevent flash
    const saved = localStorage.getItem('user_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSettings(parsed);
        if (parsed.theme === 'dark') document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
      } catch (e) {
        console.error('Failed to parse cached settings');
      }
    }

    // Consolidate auth state handling
    let isInitialized = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("[Auth] State change:", event, session?.user?.id);

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        await fetchUserData(session.user.id);
      } else {
        setProfile(null);
        setSettings(null);
        if (event === 'INITIAL_SESSION' || event === 'SIGNED_OUT' || !session) {
          setLoading(false);
        }
      }

      isInitialized = true;
    });

    const timeout = setTimeout(() => {
      if (!isInitialized) {
        console.warn("[Auth] Initialization timeout reached. Forcing loading false.");
        setLoading(false);
      }
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const fetchUserData = async (userId: string) => {
    if (fetchingUserId.current === userId) return;
    fetchingUserId.current = userId;

    console.log("[Auth] fetchUserData started for:", userId);
    try {
      // Fetch profile
      let { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError && profileError.code === 'PGRST116') {
        console.log("[Auth] Profile not found, creating default...");
        const { data: userData } = await supabase.auth.getUser();
        const email = userData.user?.email || '';
        const username = userData.user?.user_metadata?.username || email.split('@')[0];
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert([{
            id: userId,
            email,
            username,
            role: 'user',
            plan: 'free'
          }])
          .select()
          .single();

        if (!createError) profileData = newProfile;
      }
      setProfile(profileData);

      // Fetch settings
      let { data: settingsData, error: settingsError } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (settingsError && settingsError.code === 'PGRST116') {
        console.log("[Auth] Settings not found, creating default...");
        const { data: newSettings, error: createError } = await supabase
          .from('user_settings')
          .insert([{
            user_id: userId,
            theme: 'dark',
            language: 'en',
            response_style: 'detailed',
            model: 'llama-3.3-70b-versatile'
          }])
          .select()
          .single();
        if (!createError) settingsData = newSettings;
      }

      const userSettings: UserSettings = {
        theme: settingsData?.theme || 'dark',
        language: settingsData?.language || 'en',
        response_style: settingsData?.response_style || 'detailed',
        model: settingsData?.model || 'llama-3.3-70b-versatile',
      };

      setSettings(userSettings);
      localStorage.setItem('user_settings', JSON.stringify(userSettings));

      if (userSettings.theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch (error) {
      console.error('[Auth] fetchUserData error:', error);
    } finally {
      fetchingUserId.current = null;
      setLoading(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('user_settings');
  };

  const updateSettings = async (newSettings: Partial<UserSettings>) => {
    if (!user) return;
    const currentSettings = settings || {
      theme: 'dark',
      language: 'en',
      response_style: 'detailed',
      model: 'llama-3.3-70b-versatile'
    };
    const updated = { ...currentSettings, ...newSettings };
    setSettings(updated);
    localStorage.setItem('user_settings', JSON.stringify(updated));

    if (newSettings.theme) {
      if (newSettings.theme === 'dark') document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
    }

    try {
      const { error } = await supabase
        .from('user_settings')
        .upsert({ user_id: user.id, ...newSettings }, { onConflict: 'user_id' });
      if (error) throw error;
    } catch (error) {
      console.error('Error updating settings:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, settings, loading, signOut, updateSettings }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
