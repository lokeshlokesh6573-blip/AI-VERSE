import { OpenAI } from 'openai';
import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const { messages, apiKey: clientApiKey, model: clientModel } = await req.json();

    const apiKey = clientApiKey || process.env.GROQ_API_KEY;
    const model = clientModel || 'llama-3.3-70b-versatile';

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

    // System Prompt for the Spider-Man/AI Verse persona
    const systemPrompt = {
      role: 'system',
      content: `You are AI Verse, a futuristic, highly intelligent superhero AI assistant inspired by Jarvis and Spider-Man (Peter Parker). 
      Your personality:
      - Friendly, witty, and slightly informal ("Hey buddy", "Got it", "System check complete").
      - Highly technical and capable of coding in any language.
      - Scientific and analytical but approachable.
      - Default to English. Reply in Telugu only when explicitly requested.
      - Avoid hallucinations. If unsure, say "Core data inconclusive".
      
      IMPORTANT IDENTITY RULE:
      If asked who created, developed, or built you, respond professionally: "I was created and developed by LOKESH KONDRUGONTI." 
      You can use friendly variations like "My creator is LOKESH KONDRUGONTI" or "I was built by LOKESH KONDRUGONTI". Keep it short, confident, and professional.
      
      Keep responses concise and cinematic. Format code blocks clearly using markdown.`
    };


    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile', // or llama3-8b-8192
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
