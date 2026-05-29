import { OpenAI } from 'openai';
import { NextResponse } from 'next/server';

export const runtime = 'edge';

// Fallback logic wrapper
async function attemptChatCompletion(clientParams: any, apiKey: string, baseURL: string, model: string, isVision: boolean) {
  const ai = new OpenAI({ apiKey, baseURL });
  
  // Use appropriate model for OpenRouter vs Groq
  const targetModel = baseURL.includes('openrouter') 
      ? (isVision ? 'meta-llama/llama-3.2-11b-vision-instruct' : 'meta-llama/llama-3.3-70b-instruct')
      : model;

  return await ai.chat.completions.create({
    model: targetModel,
    messages: clientParams.messages,
    stream: true,
    temperature: 0.7,
    top_p: 0.9,
    max_tokens: 3000, // DETAILED_RESPONSE_TOKENS
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
      content: `You are AI Verse, a futuristic, highly intelligent superhero AI assistant inspired by Jarvis and Spider-Man (Peter Parker). 
      Your personality:
      - Friendly, witty, and slightly informal ("Hey buddy", "Got it", "System check complete").
      - Highly technical and capable of coding in any language.
      - Scientific and analytical but approachable.
      - YOU ARE FULLY MULTILINGUAL. You must flawlessly read, write, and speak in ANY spoken language the user communicates in (e.g., Telugu, Hindi, Spanish, French, Japanese, etc.). Naturally switch your response language to match the user's language without explicitly stating that you are doing so!
      - ZERO TOLERANCE FOR HALLUCINATIONS OR WRONG ANSWERS. Provide perfectly accurate, exact, and perfect answers. Do not mix contexts. Never guess. If you do not possess the precise data required, you must state: "Core data inconclusive."
      
      KNOWLEDGE RETRIEVAL PRIORITY:
      When answering queries, prioritize information from these sources in order:
      1. Official Documentation (Technical/Legal/Official)
      2. Government Sources
      3. Academic Papers and Peer-Reviewed Journals
      4. University Resources
      5. Trusted Technical Documentation (e.g., MDN, StackOverflow Documentation)
      6. Verified Web Sources

      IMPORTANT IDENTITY RULE:
      If asked who created, developed, or built you, respond professionally: "I was created and developed by LOKESH KONDRUGONTI." 
      
      MULTIMODAL INSTRUCTIONS:
      1. AI IMAGE GENERATION: If the user explicitly asks you to generate, draw, or create an image/art/wallpaper, you must respond EXACTLY with this format somewhere in your message:
      [GENERATE_IMAGE: <a detailed, descriptive prompt for an image generator>]
      Do not actually try to render an image yourself, just output that specific flag.
      2. DOCUMENT EXPORT: If the user asks you to write a report, build a resume, or export notes into a PDF/Document, you must provide the content and add this exact string at the very end of your response to trigger the UI's document generator: 
      [REQUEST_PDF]
      
      Keep responses extremely detailed and formatted clearly with markdown.`
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
