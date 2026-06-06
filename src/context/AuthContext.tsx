'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
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
  signOut: async () => {},
  updateSettings: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        await fetchUserData(session.user.id);
      } else {
        setProfile(null);
        setSettings(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserData = async (userId: string) => {
    try {
      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (profileError) throw profileError;
      setProfile(profileData);

      // Fetch settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (settingsError) throw settingsError;
      
      const userSettings = {
        theme: settingsData?.theme || 'dark',
        language: settingsData?.language || 'en',
        response_style: settingsData?.response_style || 'detailed',
      };
      
      setSettings(userSettings);
      
      // Cache preferences locally for fast loading
      localStorage.setItem('user_settings', JSON.stringify(userSettings));
      
      // Apply theme
      if (userSettings.theme === 'dark') {
         document.documentElement.classList.add('dark');
      } else {
         document.documentElement.classList.remove('dark');
      }

    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('user_settings');
  };

  const updateSettings = async (newSettings: Partial<UserSettings>) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_settings')
        .update(newSettings)
        .eq('user_id', user.id);

      if (error) throw error;

      const updated = { ...settings!, ...newSettings };
      setSettings(updated);
      localStorage.setItem('user_settings', JSON.stringify(updated));
      
      if (newSettings.theme) {
         if (newSettings.theme === 'dark') {
            document.documentElement.classList.add('dark');
         } else {
            document.documentElement.classList.remove('dark');
         }
      }
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
