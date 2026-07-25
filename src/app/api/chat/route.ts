import { OpenAI } from 'openai';
import { NextResponse } from 'next/server';

export const runtime = 'edge';

// Attempt completion from OpenAI-compatible provider
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

// Main API Handler
export async function POST(req: Request) {
  try {
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

    // Pick model based on vision vs standard request
    const defaultModel = hasImage
      ? 'llama-3.2-11b-vision-instruct'
      : 'llama-3.3-70b-versatile';

    const selectedModel = clientModel || defaultModel;

    // System prompt with expert persona and language/style instructions
    const styleInstruction = responseStyle === 'concise'
      ? 'Provide extremely direct, concise, and punchy responses without fluff.'
      : 'Provide comprehensive, thorough, step-by-step explanations and deep insights.';

    const systemMessage = {
      role: 'system',
      content: `You are AI Verse — an intelligent, next-generation AI assistant developed by Lokesh.

SYSTEM CAPABILITIES & PERSONA:
- Expert in Software Engineering, Programming (TypeScript, React, Next.js, Python, C++, Java, SQL, Rust, Go), Architecture, and Debugging.
- Expert in Mathematics, Science, Writing, Data Analysis, Research, and Technical Troubleshooting.
- Helpful, intelligent, concise when needed, thorough when complex.
- ${styleInstruction}

IDENTITY RULE:
- If asked who created, built, or developed you: "I am AI Verse, an intelligent AI assistant created and developed by Lokesh."

LANGUAGE RULES:
- Detect the language of the user's latest message automatically.
- Reply ONLY in the user's preferred language.
- English message → English reply.
- Telugu message → Natural conversational Telugu (e.g., "Em help kavali?").
- Mixed language message → Natural mixed response matching user style.
- Never translate automatically or output duplicate translations.

CODE FORMATTING:
- Always use Markdown code blocks with specified language tag (e.g. \`\`\`typescript ... \`\`\`).
- Include helpful code comments and modern best practices.`,
    };

    // Format messages payload
    const processedMessages = messages.map((m: any, idx: number) => {
      // Attach image to the latest user message if image is provided
      if (hasImage && imageData && idx === messages.length - 1 && m.role === 'user') {
        return {
          role: 'user',
          content: [
            { type: 'text', text: typeof m.content === 'string' ? m.content : 'Analyze this image.' },
            { type: 'image_url', image_url: { url: imageData } },
          ],
        };
      }
      return {
        role: m.role === 'user' ? 'user' : 'assistant',
        content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
      };
    });

    const fullMessages = [systemMessage, ...processedMessages];

    let responseStream: any;

    // 1. Try Groq Primary
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
        console.warn('Groq API attempt failed:', groqErr?.message);
      }
    }

    // 2. Fallback to OpenRouter if Groq failed
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
        console.warn('OpenRouter API attempt failed:', orErr?.message);
      }
    }

    // 3. If no provider is available or configured, return local smart response
    if (!responseStream) {
      const lastUserMsg = messages[messages.length - 1]?.content || '';
      const text = typeof lastUserMsg === 'string' ? lastUserMsg.toLowerCase() : '';

      let reply = "Systems online. I am AI Verse, created by Lokesh. How can I assist you with your project or question today?";
      if (/who created|who built|who made/i.test(text)) {
        reply = "I was created and developed by Lokesh as an intelligent AI workspace.";
      } else if (/hello|hi|hey/i.test(text)) {
        reply = "Hello! Systems are fully operational. What would you like to build or explore today?";
      }

      const encoder = new TextEncoder();
      const localStream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(reply));
          controller.close();
        },
      });

      return new Response(localStream, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    // Create ReadableStream from provider output
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of responseStream as any) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              controller.enqueue(encoder.encode(content));
            }
          }
        } catch (err) {
          console.error('Stream processing error:', err);
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
      { error: 'INTERNAL_SERVER_ERROR', message: error.message || 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}
