import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.warn("Supabase credentials missing. Using placeholders for build stability.");
}

export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * DB Table schema:
 * - profiles (id, username, email, avatar_url, role, plan)
 * - user_settings (id, user_id, theme, language, response_style, model)
 * - conversations (id, user_id, title, updated_at, created_at)
 * - messages (id, conversation_id, user_id, role, content, created_at)
 */

// Utility to create a new conversation with automatic fallback for mock/unauthenticated users
export async function createConversation(userId: string, title: string = 'New Conversation') {
    if (!userId || userId.startsWith('mock-') || userId === 'guest') {
        return {
            id: `local-conv-${Date.now()}`,
            user_id: userId || 'guest',
            title,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
    }

    try {
        const { data, error } = await supabase
            .from('conversations')
            .insert([{ user_id: userId, title }])
            .select()
            .single();
            
        if (error) {
            console.warn("Supabase Create Conversation Warning (using local fallback):", error.message);
            return {
                id: `local-conv-${Date.now()}`,
                user_id: userId,
                title,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
        }
        return data;
    } catch (err: any) {
        console.warn("Supabase Create Conversation Exception (using local fallback):", err?.message);
        return {
            id: `local-conv-${Date.now()}`,
            user_id: userId,
            title,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
    }
}

// Utility to save a message with fallback
export async function saveMessage(conversationId: string, userId: string, role: string, content: string) {
    if (!userId || conversationId.startsWith('local-conv-') || userId.startsWith('mock-')) {
        return {
            id: `local-msg-${Date.now()}`,
            conversation_id: conversationId,
            user_id: userId || 'guest',
            role,
            content,
            created_at: new Date().toISOString()
        };
    }

    try {
        const { data, error } = await supabase
            .from('messages')
            .insert([{ conversation_id: conversationId, user_id: userId, role, content }])
            .select()
            .single();
            
        if (error) {
            console.warn("Supabase Save Message Warning:", error.message);
            return null;
        }

        // Update conversation's updated_at timestamp
        await supabase
            .from('conversations')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', conversationId);

        return data;
    } catch (err: any) {
        console.warn("Supabase Save Message Exception:", err?.message);
        return null;
    }
}

// Utility to fetch all conversations for a user
export async function fetchUserConversations(userId: string) {
    if (!userId || userId.startsWith('mock-') || userId === 'guest') {
        return [];
    }

    try {
        const { data, error } = await supabase
            .from('conversations')
            .select('*')
            .eq('user_id', userId)
            .order('updated_at', { ascending: false });

        if (error) {
            console.warn("Supabase Fetch Conversations Error:", error.message);
            return [];
        }
        return data || [];
    } catch (err: any) {
        console.warn("Supabase Fetch Conversations Exception:", err?.message);
        return [];
    }
}

// Utility to fetch messages for a conversation
export async function fetchConversationMessages(conversationId: string) {
    if (!conversationId || conversationId.startsWith('local-conv-')) {
        return [];
    }

    try {
        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true });

        if (error) {
            console.warn("Supabase Fetch Messages Error:", error.message);
            return [];
        }
        return data || [];
    } catch (err: any) {
        console.warn("Supabase Fetch Messages Exception:", err?.message);
        return [];
    }
}

