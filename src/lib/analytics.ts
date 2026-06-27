import { supabase } from './supabase';

export async function logEvent(userId: string | undefined, eventType: string, metadata: any = {}) {
  // Analytics disabled until table is created in Supabase
  return;
}

export const Analytics = {
  chatSent: (userId: string | undefined) => {},
  settingsChanged: (userId: string | undefined, setting: string) => {},
  accountAccess: (userId: string | undefined, mode: 'login' | 'signup') => {},
};
