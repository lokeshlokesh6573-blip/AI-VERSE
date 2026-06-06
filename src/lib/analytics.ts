import { supabase } from './supabase';

export async function logEvent(userId: string | undefined, eventType: string, metadata: any = {}) {
  try {
    const { error } = await supabase
      .from('analytics_logs')
      .insert([
        {
          user_id: userId,
          event_type: eventType,
          metadata: {
            ...metadata,
            ua: navigator.userAgent,
            path: window.location.pathname,
          },
        }
      ]);
    
    if (error) throw error;
  } catch (err) {
    console.error('Analytics failed:', err);
  }
}

export const Analytics = {
  chatSent: (userId: string | undefined) => logEvent(userId, 'chat_sent'),
  settingsChanged: (userId: string | undefined, setting: string) => logEvent(userId, 'settings_changed', { setting }),
  accountAccess: (userId: string | undefined, mode: 'login' | 'signup') => logEvent(userId, 'account_access', { mode }),
};
