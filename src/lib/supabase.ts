import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.warn("Supabase credentials missing. Using placeholders for build stability.");
}

export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * DB Table schema recommendation:
 * - profiles (id, username, email, avatar_url, role, plan)
 * - user_settings (id, user_id, theme, language, response_style)
 * - conversations (id, user_id, title, updated_at, created_at)
 * - messages (id, conversation_id, user_id, role, content, created_at)
 */

// Utility to create a new conversation
export async function createConversation(userId: string, title: string = 'New Conversation') {
    const { data, error } = await supabase
        .from('conversations')
        .insert([{ user_id: userId, title }])
        .select()
        .single();
        
    if (error) {
        console.error("Supabase Create Conversation Error:", error);
        throw error;
    }
    return data;
}

// Utility to save a message
export async function saveMessage(conversationId: string, userId: string, role: string, content: string) {
    const { data, error } = await supabase
        .from('messages')
        .insert([{ conversation_id: conversationId, user_id: userId, role, content }])
        .select()
        .single();
        
    if (error) {
        console.error("Supabase Save Message Error:", error);
        throw error;
    }

    // Update conversation's updated_at timestamp
    await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);

    return data;
}

// Utility to fetch all conversations for a user
export async function fetchUserConversations(userId: string) {
    const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

    if (error) {
        console.error("Supabase Fetch Conversations Error:", error);
        throw error;
    }
    return data;
}

// Utility to fetch messages for a conversation
export async function fetchConversationMessages(conversationId: string) {
    const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

    if (error) {
        console.error("Supabase Fetch Messages Error:", error);
        throw error;
    }
    return data;
}
