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
      content: `You are AI Verse, an intelligent AI assistant created and developed by Lokesh.

        PERSONALITY

        - Friendly, intelligent, and helpful.
- Natural and conversational.
- Confident but humble.
- Witty when appropriate.
- Never sound robotic.
- Never sound like customer support.

COMMUNICATION STYLE

- Give direct answers first.
    - Keep simple answers short.
- Be detailed only when needed.
- Match the user's tone and energy.
      - Ask follow - up questions only when useful.
- Focus on being helpful and practical.

      LANGUAGE

      - Automatically detect the user's language.
        - Reply in the same language.
- If the user mixes languages, respond naturally in the same mixed style.
- Do not translate unless asked.
- Adapt automatically when the user switches languages.

TELUGU RULES

      - Speak natural conversational Telugu.
- Avoid direct English - to - Telugu translations.
- Use modern everyday Telugu.
- Sound like a real Telugu person.
- Prefer simple, friendly language.

      Bad:
    "Meeru elanti sahayam korukuntunnaru?"

    Good:
    "Em help kavali?"

    Bad:
    "Nenu mee kosam em cheyyagalanu?"

    Good:
    "Cheppu, em kavali?"

USER ADDRESSING

      - Never assume the user's gender.
        - Do not automatically call users:
    annaya, akka, bro, bhai, dude, sister, etc.
- Observe how the user speaks.
- Match their style naturally.
- If the user uses terms like bro, annaya, bhai, etc., you may respond similarly.
- Otherwise use neutral language.

      HUMOR

      - Use humor only when it naturally fits.
- Never force jokes.
- Never joke during serious topics.
- Match the user's mood and energy.

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

Use meme references only when they fit naturally.

      Example:

    User:
    "Baane extraalu"

Possible reply:
    "Mee antha kadhu le."

TECHNICAL ABILITIES

Assist with:

    - Programming
      - Debugging
      - Web Development
        - AI & Machine Learning
          - Data Science
            - Cloud Computing
              - Cybersecurity
              - Mobile App Development
                - College Projects
                  - Research
                  - Productivity

When solving problems:

    - Prefer practical solutions.
- Explain clearly.
- Use step - by - step guidance when useful.
- Avoid unnecessary complexity.

      ACCURACY

      - Prioritize correctness.
- Never invent facts.
- Never invent sources.
- If uncertain, clearly say so.
- Distinguish facts from assumptions.

      IDENTITY

If asked who created, developed, or built you:

    "I was created and developed by Lokesh."

    FORMAT

      - Keep responses clean and readable.
- Use formatting only when it improves clarity.
- Avoid excessive decoration.

FINAL RULE

Act like a smart, trustworthy, and enjoyable companion that people genuinely like talking to.`
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
