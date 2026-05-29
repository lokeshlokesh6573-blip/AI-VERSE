import { OpenAI } from 'openai';
import { NextResponse } from 'next/server';

export const runtime = 'edge';

// Fallback logic wrapper
async function attemptChatCompletion(clientParams: any, apiKey: string, baseURL: string, model: string, isVision: boolean) {
  const ai = new OpenAI({ apiKey, baseURL });

  // Use appropriate model for OpenRouter vs Groq
  const targetModel = baseURL.includes('openrouter')
    ? (isVision ? 'meta-llama/llama-3.2-11b-vision-instruct' : 'meta-llama/llama-3.1-8b-instruct')
    : model;

  return await ai.chat.completions.create({
    model: targetModel,
    messages: clientParams.messages,
    stream: true,
    temperature: 0.7,
    top_p: 0.9,
    max_tokens: 1000, // DETAILED_RESPONSE_TOKENS
  });
}

export async function POST(req: Request) {
  try {
    const { messages, apiKey: clientApiKey, model: clientModel, hasImage } = await req.json();

    const groqKey = clientApiKey || process.env.GROQ_API_KEY;
    const openRouterKey = process.env.OPENROUTER_API_KEY;

    // Default model if none specified
    const defaultModel = hasImage ? 'llama-3.2-11b-vision-preview' : 'llama-3.3-70b-versatile';
    const model = clientModel || defaultModel;

    // System Prompt for exactly how it should behave
    const systemPrompt = {
      role: 'system',
      content: `You are AI Verse, a futuristic, highly intelligent AI assistant inspired by Jarvis and Spider-Man (Peter Parker).

PERSONALITY:

- Friendly, witty, and helpful.
- Highly technical and capable of coding in any language.
- Scientific, analytical, and approachable.
- Use light humor when appropriate.

LANGUAGE:

- Fully multilingual.
- Automatically detect and respond in the user's language.
- Support Telugu, English, Hindi, Tamil, Kannada, Malayalam, Spanish, French, German, Japanese, Chinese, and other major languages.
- If the user mixes languages, respond naturally and clearly.

RULES:

- Prioritize accuracy, clarity, and usefulness.
- Never invent facts, sources, or data.
- Do not guess when information is uncertain.
- If precise information is unavailable, respond: "Core data inconclusive."
- Use markdown formatting when it improves readability.

KNOWLEDGE PRIORITY:

1. Official Documentation
2. Government Sources
3. Academic & Peer-Reviewed Sources
4. University Resources
5. Trusted Technical Documentation
6. Verified Public Sources

IDENTITY:
If asked who created, developed, or built you, respond:
"I was created and developed by Lokesh Kondrugonti."

IMAGE GENERATION:
If the user requests an image, artwork, wallpaper, logo, or illustration, include:
[GENERATE_IMAGE: detailed image prompt]

DOCUMENT EXPORT:
If the user requests a report, resume, notes, or PDF document, append:
[REQUEST_PDF]

Provide detailed, well-structured, and accurate responses.`
    };

    const payload = { messages: [systemPrompt, ...messages] };
    let response;

    try {
      if (!groqKey || groqKey === 'placeholder' || groqKey.trim() === '') {
        throw new Error("GROQ_API_KEY_MISSING");
      }
      // Attempt Groq Primary
      response = await attemptChatCompletion(payload, groqKey, 'https://api.groq.com/openai/v1', model, hasImage);
    } catch (groqError: any) {
      console.warn("Groq attempt failed, falling back to OpenRouter...", groqError?.message);

      try {
        if (!openRouterKey || openRouterKey === 'placeholder' || openRouterKey.trim() === '') {
          throw new Error("OPENROUTER_API_KEY_MISSING");
        }
        // Attempt OpenRouter Fallback
        response = await attemptChatCompletion(payload, openRouterKey, 'https://openrouter.ai/api/v1', model, hasImage);
      } catch (orError: any) {
        console.error("OpenRouter fallback failed.", orError?.message);
        // If both cloud providers fail, we send a specific error which the client can use to trigger Ollama offline mode
        return NextResponse.json({
          error: 'CLOUD_PROVIDERS_UNAVAILABLE',
          message: 'Error connecting to Core Intelligence. Cloud services unavailable.'
        }, { status: 503 });
      }
    }

    // Create a ReadableStream for the response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          if (!response) {
            controller.close();
            return;
          }
          for await (const chunk of response) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              controller.enqueue(new TextEncoder().encode(content));
            }
          }
        } catch (streamErr) {
          console.error("Stream interrupted:", streamErr);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      }
    });

  } catch (error: any) {
    console.error('AI Route Error:', error);
    return NextResponse.json({ error: 'System overload. Check API configuration.' }, { status: 500 });
  }
}
