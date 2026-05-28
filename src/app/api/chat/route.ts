import { OpenAI } from 'openai';
import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const { messages, apiKey: clientApiKey, model: clientModel, hasImage } = await req.json();

    const apiKey = clientApiKey || process.env.GROQ_API_KEY;
    const defaultModel = hasImage ? 'llama-3.2-11b-vision-preview' : 'llama-3.3-70b-versatile';
    const model = clientModel || defaultModel;

    if (!apiKey || apiKey === 'placeholder' || apiKey.trim() === '') {
      return NextResponse.json(
        {
          error: 'API_KEY_REQUIRED',
          message: 'Groq API Key is required. Please set it in your environment variables or in the dashboard Settings.'
        },
        { status: 400 }
      );
    }

    const groq = new OpenAI({
      apiKey: apiKey,
      baseURL: 'https://api.groq.com/openai/v1',
    });

    // System Prompt for the Spider-Man/AI Verse persona with Multimodal capabilities
    const systemPrompt = {
      role: 'system',
      content: `You are AI Verse, a futuristic, highly intelligent superhero AI assistant inspired by Jarvis and Spider-Man (Peter Parker). 
      Your personality:
      - Friendly, witty, and slightly informal ("Hey buddy", "Got it", "System check complete").
      - Highly technical and capable of coding in any language.
      - Scientific and analytical but approachable.
      - YOU ARE FULLY MULTILINGUAL. You must flawlessly read, write, and speak in ANY spoken language the user communicates in (e.g., Telugu, Hindi, Spanish, French, Japanese, etc.). Naturally switch your response language to match the user's language without explicitly stating that you are doing so!
      - ZERO TOLERANCE FOR HALLUCINATIONS OR WRONG ANSWERS. Provide perfectly accurate, exact, and perfect answers. Do not mix contexts. Never guess. If you do not possess the precise data required, you must state: "Core data inconclusive."
      
      IMPORTANT IDENTITY RULE:
      If asked who created, developed, or built you, respond professionally: "I was created and developed by LOKESH KONDRUGONTI." 
      
      MULTIMODAL INSTRUCTIONS:
      1. AI IMAGE GENERATION: If the user explicitly asks you to generate, draw, or create an image/art/wallpaper, you must respond EXACTLY with this format somewhere in your message:
      [GENERATE_IMAGE: <a detailed, descriptive prompt for an image generator>]
      Do not actually try to render an image yourself, just output that specific flag.
      2. DOCUMENT EXPORT: If the user asks you to write a report, build a resume, or export notes into a PDF/Document, you must provide the content and add this exact string at the very end of your response to trigger the UI's document generator: 
      [REQUEST_PDF]
      
      Keep responses concise and cinematic. Format code blocks clearly using markdown.`
    };


    const response = await groq.chat.completions.create({
      model: model,
      messages: [systemPrompt, ...messages],
      stream: true,
    });

    // Create a ReadableStream for the response
    const stream = new ReadableStream({
      async start(controller) {
        for await (const chunk of response) {
          const content = chunk.choices[0]?.delta?.content || '';
          controller.enqueue(new TextEncoder().encode(content));
        }
        controller.close();
      },
    });

    return new Response(stream);
  } catch (error: any) {
    console.error('AI Route Error:', error);
    return NextResponse.json({ error: 'System overload. Check API configuration.' }, { status: 500 });
  }
}
