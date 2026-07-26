import { NextResponse } from 'next/server';
import { webSearch, needsWebSearch } from '@/lib/web-search';
import { detectModules, buildSystemPrompt, compressConversation } from '@/lib/prompts';
import { improvePrompt } from '@/lib/prompt-engine';
import { checkRateLimit } from '@/lib/rate-limit';
import { routeRequest } from '@/lib/providers';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    // ── Rate limiting ──
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const { allowed } = checkRateLimit(ip);
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

    // ── Route request through provider chain ──
    const { stream, provider } = await routeRequest({
      messages: fullMessages,
      model: selectedModel,
      temperature,
      maxTokens,
      hasImage,
    });

    // ── Local fallback ──
    if (!stream) {
      const text = lastUserText.toLowerCase();
      let reply = "Systems online. I am AI Verse, created by Lokesh. How can I assist you?";

      if (/who created|who built|who made/i.test(text)) {
        reply = "I was created and developed by Lokesh.";
      } else if (/hello|hi|hey/i.test(text)) {
        reply = "Hello! What would you like to explore today?";
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

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Provider': provider,
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
