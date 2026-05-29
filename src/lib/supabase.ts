import { createClient } from '@supabase/supabase-js';

// These can be safely exposed to the client in Next.js via NEXT_PUBLIC prefix.
// The user will need to add these to their .env file.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-url.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * DB Table schema recommendation:
 * Table: `ai_verse_chats`
 * Columns:
 * - id (uuid, pk)
 * - created_at (timestamptz)
 * - user_id (string/uuid, optional for auth)
 * - title (string)
 * - messages (jsonb) - stores the array of user/ai messages
 */

// Example utility to save a chat
export async function saveChatSession(title: string, messages: any[]) {
    // If not configured, just return silently for local testing
    if (supabaseUrl.includes('placeholder')) return null;

    const { data, error } = await supabase
        .from('ai_verse_chats')
        .insert([
            { title, messages, created_at: new Date().toISOString() }
        ])
        .select();
        
    if (error) {
        console.error("Supabase Save Error:", error);
        throw error;
    }
    
    return data;
}

export async function fetchSavedChats() {
    if (supabaseUrl.includes('placeholder')) return [];

    const { data, error } = await supabase
        .from('ai_verse_chats')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Supabase Fetch Error:", error);
        throw error;
    }

    return data;
}
