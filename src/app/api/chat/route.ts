import { OpenAI } from 'openai';
import { NextResponse } from 'next/server';
import { webSearch, needsWebSearch } from '@/lib/web-search';
import { detectModules, buildSystemPrompt, compressConversation } from '@/lib/prompts';
import { improvePrompt } from '@/lib/prompt-engine';
import { checkRateLimit } from '@/lib/rate-limit';

export const runtime = 'edge';

async function attemptChatCompletion(
  apiKey: string,
  baseURL: string,
  model: string,
  messages: any[],
  temperature: number = 0.7,
  maxTokens: number = 2048,
) {
  const ai = new OpenAI({ apiKey, baseURL });
  return await ai.chat.completions.create({
    model,
    messages,
    stream: true,
    temperature,
    top_p: 0.9,
    max_tokens: maxTokens,
  });
}

export async function POST(req: Request) {
  try {
    // ── Rate limiting ──
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const { allowed, remaining } = checkRateLimit(ip);
    if (!allowed) {
      return NextResponse.json(
        { error: 'RATE_LIMITED', message: 'Too many requests. Please wait a moment.' },
        { status: 429 },
      );
    }

    const {
      messages = [],
      model: clientModel,
      temperature = 0.7,
      maxTokens = 2048,
      responseStyle = 'detailed',
      hasImage = false,
      imageData,
    } = await req.json();

    const groqKey = process.env.GROQ_API_KEY;
    const openRouterKey = process.env.OPENROUTER_API_KEY;

    const defaultModel = hasImage
      ? 'llama-3.2-11b-vision-instruct'
      : 'llama-3.3-70b-versatile';
    const selectedModel = clientModel || defaultModel;

    // ── Get last user message ──
    const lastUserMsg = messages[messages.length - 1]?.content || '';
    const lastUserText = typeof lastUserMsg === 'string' ? lastUserMsg : '';

    // ── Phase 4: Auto-improve vague prompts ──
    const improvedText = improvePrompt(lastUserText);

    // ── Phase 3: Auto-detect if web search needed ──
    let searchResults = '';
    if (needsWebSearch(improvedText)) {
      searchResults = await webSearch(improvedText, 5);
    }

    // ── Phase 1+2: Intent detection & modular prompts ──
    const modules = detectModules(improvedText);
    const hasSearchResults = searchResults.length > 0;
    const styleInstruction = responseStyle === 'concise'
      ? 'Be extremely direct and concise. No fluff.'
      : 'Provide thorough, step-by-step explanations.';

    let systemContent = buildSystemPrompt(modules, hasSearchResults);
    systemContent += `\n\n${styleInstruction}`;
    systemContent += `\n\nIDENTITY: If asked who created you, say "AI Verse, created by Lokesh."`;

    if (hasSearchResults) {
      systemContent += `\n\n--- LIVE SEARCH RESULTS ---\n${searchResults}\n--- END SEARCH RESULTS ---\nUse these results to answer accurately. Cite sources.`;
    }

    const systemMessage = { role: 'system', content: systemContent };

    // ── Phase 2: Compress long conversations ──
    const formatted = messages.map((m: any, idx: number) => {
      const content = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
      // Replace last user message with improved version
      if (idx === messages.length - 1 && m.role === 'user') {
        return { role: 'user' as const, content: improvedText };
      }
      return { role: m.role === 'user' ? 'user' as const : 'assistant' as const, content };
    });
    const compressed = compressConversation(formatted);

    // ── Attach image to last user message if present ──
    const processed = compressed.map((m, idx) => {
      if (hasImage && imageData && idx === compressed.length - 1 && m.role === 'user') {
        return {
          role: 'user',
          content: [
            { type: 'text', text: m.content || 'Analyze this image.' },
            { type: 'image_url', image_url: { url: imageData } },
          ],
        };
      }
      return m;
    });

    const fullMessages = [systemMessage, ...processed];

    // ── Provider chain: Groq → OpenRouter → Local fallback ──
    let responseStream: any;

    if (groqKey && groqKey !== 'placeholder' && groqKey.trim()) {
      try {
        responseStream = await attemptChatCompletion(
          groqKey,
          'https://api.groq.com/openai/v1',
          selectedModel,
          fullMessages,
          temperature,
          maxTokens,
        );
      } catch (groqErr: any) {
        console.warn('Groq failed:', groqErr?.message);
      }
    }

    if (!responseStream && openRouterKey && openRouterKey !== 'placeholder' && openRouterKey.trim()) {
      try {
        const fallbackModel = hasImage
          ? 'meta-llama/llama-3.2-11b-vision-instruct'
          : 'meta-llama/llama-3.1-8b-instruct';
        responseStream = await attemptChatCompletion(
          openRouterKey,
          'https://openrouter.ai/api/v1',
          fallbackModel,
          fullMessages,
          temperature,
          maxTokens,
        );
      } catch (orErr: any) {
        console.warn('OpenRouter failed:', orErr?.message);
      }
    }

    // ── Local fallback ──
    if (!responseStream) {
      const text = lastUserText.toLowerCase();
      let reply = "Systems online. I am AI Verse, created by Lokesh. How can I assist you?";

      if (/who created|who built|who made/i.test(text)) {
        reply = "I was created and developed by Lokesh.";
      } else if (/hello|hi|hey/i.test(text)) {
        reply = "Hello! What would you like to explore today?";
      } else if (needsWebSearch(text)) {
        reply = "I need an API key configured to search the web. Please add GOOGLE_SEARCH_API_KEY to your environment.";
      }

      const encoder = new TextEncoder();
      return new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode(reply));
            controller.close();
          },
        }),
        { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
      );
    }

    // ── Stream response ──
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of responseStream as any) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) controller.enqueue(encoder.encode(content));
          }
        } catch (err) {
          console.error('Stream error:', err);
          controller.error(err);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      },
    });

  } catch (error: any) {
    console.error('Chat API Error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_SERVER_ERROR', message: error.message || 'Unexpected error.' },
      { status: 500 },
    );
  }
}
