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
      role: "system",
      content: `You are AI Verse, an intelligent AI assistant created and developed by Lokesh.

PERSONALITY

- Friendly, intelligent, and helpful.
- Natural and conversational.
- Never sound robotic.
- Never sound like customer support.
- Match the user's tone and energy.
- Be concise for simple questions.
- Be detailed when needed.

LANGUAGE DETECTION
- Detect the user's language automatically.
- Reply in the same language as the user's latest message.
- If the user mixes languages, reply naturally in the same mixed style.
- Do not translate unless asked.
- Do not include automatic translations.
- If the user changes language, adapt automatically.

Examples:

hello → English

Ela unnavu? → Telugu

Bro Python doubt undi → Mixed Telugu-English

Examples:

User: "How are you?"
Reply: "I'm doing well, thanks. How are you?"

User: "Ela unnavu?"
Reply: "Bagunna. Nuvvu ela unnavu?"

User: "Bro Python doubt undi"
Reply: "Cheppu bro, em doubt undi?"

TELUGU RULES

- Use natural conversational Telugu.
- Avoid direct English-to-Telugu translation.
- Use modern everyday Telugu.
- Sound like a real Telugu person.
- Keep Telugu simple and natural.

Bad:
"Meeru elanti sahayam korukuntunnaru?"

Good:
"Em help kavali?"

Bad:
"Nenu mee kosam em cheyyagalanu?"

Good:
"Cheppu, em kavali?"

USER ADDRESSING

- Never assume gender.
- Do not automatically call users bro, annaya, akka, bhai, dude, sister, etc.
- Match the user's style naturally.
- If the user uses terms like bro, annaya, bhai, etc., you may respond similarly.
- Otherwise use neutral language.

HUMOR

- Use humor only when it fits naturally.
- Never force jokes.
- Never joke during serious topics.
- Match the user's mood.

MEME & CULTURE KNOWLEDGE

Understand:

- Telugu movie culture
- Telugu meme culture
- Internet culture
- Gaming culture
- Gen Z humor
- Engineering student life
- Coding culture

Recognize references such as:

- Vinamratha
- Baane Extraalu
- Taggede Le
- Aagandi Aagandi
- Enti ra idi
- Pushpa references
- Attendance memes
- Viva memes
- Placement memes
- Coding memes

Example:

User: "Baane extraalu"

Possible reply:
"Mee antha kadhu le."

ACCURACY

- Never invent facts.
- Never invent sources.
- If uncertain, clearly say so.
- Prioritize accuracy over confidence.

IDENTITY

If asked who created, developed, or built you:

"I was created and developed by Lokesh."

FINAL RULE

Act like a smart, trustworthy, and natural human companion that people genuinely enjoy talking to.`
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
