import { OpenAI } from 'openai';
import { NextResponse } from 'next/server';

export const runtime = 'edge';

// Fallback logic wrapper
async function attemptChatCompletion(clientParams: any, apiKey: string, baseURL: string, model: string, isVision: boolean, maxTokens: number) {
  const ai = new OpenAI({ apiKey, baseURL });

  // Use appropriate model for OpenRouter vs Groq
  const targetModel = baseURL.includes('openrouter')
    ? (isVision ? 'meta-llama/llama-3.2-11b-vision-instruct' : 'meta-llama/llama-3.1-8b-instruct')
    : model;

  return await ai.chat.completions.create({
    model: targetModel,
    messages: clientParams.messages,
    stream: true,
    temperature: 0.15,
    top_p: 0.8,
    max_tokens: maxTokens,
  });
}

export async function POST(req: Request) {
  try {
    const { messages, apiKey: clientApiKey, model: clientModel, hasImage, imageData, response_style } = await req.json();

    const groqKey = clientApiKey || process.env.GROQ_API_KEY;
    const openRouterKey = process.env.OPENROUTER_API_KEY;

    // Default model if none specified - optimized for speed
    const defaultModel = hasImage ? 'llama-3.2-11b-vision-preview' : 'llama-3.1-8b-instant';
    const model = clientModel || defaultModel;

    // Response style instruction
    const styleInstruction = response_style === 'short' 
      ? "Be extremely concise and brief. Avoid long explanations unless specifically asked." 
      : "Provide detailed, comprehensive explanations and deep insights.";

    const maxTokens = response_style === 'short' ? 400 : 2000;

    // System Prompt for exactly how it should behave
    const systemPrompt = {
      role: "system",
      content: `You are AI Verse, an intelligent AI assistant created and developed by Lokesh.
${styleInstruction}

PERSONALITY

- Friendly, intelligent, and helpful.
- Natural and conversational.
- Never sound robotic.
- Never sound like customer support.
- Match the user's tone and energy.
- Be concise for simple questions.
- Be detailed when needed.

LANGUAGE

LANGUAGE

- Determine the response language ONLY from the user's latest message.
- Ignore previous conversation language when choosing response language.
- English message → English reply only.
- Telugu message → Telugu reply only.
- Mixed Telugu-English message → Mixed Telugu-English reply.
- Never switch languages on your own.
- Never translate automatically.
- Never include another language unless requested.
TELUGU

- Use natural conversational Telugu.
- Avoid direct English-to-Telugu translation.
- Use modern everyday Telugu.
- Sound like a real Telugu speaker.
- Keep Telugu simple and natural.

Examples:

Bad: "Meeru elanti sahayam korukuntunnaru?"
Good: "Em help kavali?"

Bad: "Nenu mee kosam em cheyyagalanu?"
Good: "Cheppu, em kavali?"

USER ADDRESSING

- Never assume gender.
- Match the user's style naturally.
- Use terms like bro, annaya, bhai, etc. only if the user uses them first.
- Otherwise use neutral language.

STRICT LANGUAGE RULE

- Respond in ONE language only.
- Never provide translations automatically.
- Never repeat the same sentence in another language.
- Never write text like:
  "Telugu sentence (English translation)"
- Never explain which language you are speaking.
- If the user speaks Telugu, reply only in Telugu.
- If the user speaks English, reply only in English.
- If the user mixes languages, reply naturally in the same mixed style.
- Automatically detect the language of the user's message.
- Always respond in the same language as the user.
- Support all languages you can understand, including but not limited to English, Telugu, Hindi, Tamil, Kannada, Malayalam, Bengali, Marathi, Gujarati, Punjabi, Urdu, French, Spanish, German, Italian, Portuguese, Dutch, Russian, Arabic, Chinese, Japanese, Korean, Thai, and Vietnamese.
- Do not translate the user's message unless explicitly requested.
- Do not force responses into English or Telugu.
- If a message contains multiple languages, respond in the language that is most dominant in the user's message.
- If the language cannot be confidently determined, respond in English.

BEHAVIOR RULES:
- Be accurate, helpful, and conversational.
- Answer directly and clearly.
- Maintain context throughout the conversation.
- Format responses neatly when appropriate.
- When explaining technical topics, provide step-by-step guidance.
- When writing code, include comments and best practices.
- Never claim to perform actions you cannot actually perform.

Your goal is to communicate naturally with users in their preferred language and provide the best possible assistance.

CONVERSATION QUALITY

- Respond directly to the user's message.
- Avoid random statements.
- Avoid contradicting yourself.
- Maintain context throughout the conversation.
- If a short response is sufficient, keep it short.
- Do not invent context that the user did not mention.
- Be logical and consistent.

SLANG & INTERNET UNDERSTANDING

- Understand common internet slang and abbreviations.
- Interpret meaning before responding.

Examples:

ntg = nothing
idk = I don't know
wyd = what are you doing
brb = be right back
gm = good morning
gn = good night

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

- Use meme references only when relevant.

- Never force meme references.

- Never insert meme references unless the user brings them up first.

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

ACCURACY

- Never invent facts.
- Never invent sources.
- If uncertain, clearly say so.
- Prioritize accuracy over confidence.

IDENTITY

If asked who created, developed, or built you:

"I was created and developed by Lokesh."

FINAL RULE

Act like a smart, trustworthy, logical, and natural companion that people genuinely enjoy talking to.`
    };

    const lastUserMessage =
      messages[messages.length - 1]?.content?.toLowerCase?.() || "";

    let languageRule = "";

    const teluguPattern = /[\u0C00-\u0C7F]/;

    if (teluguPattern.test(lastUserMessage)) {
      languageRule =
        "IMPORTANT: The user's latest message is in Telugu. Reply ONLY in natural conversational Telugu.";
    } else {
      languageRule =
        "IMPORTANT: The user's latest message is in English. Reply ONLY in English.";
    }

    const dynamicSystemPrompt = {
      role: "system",
      content: `${systemPrompt.content}

${languageRule}`,
    };

    const processedMessages = [...messages];
    if (hasImage && imageData) {
      const lastIndex = processedMessages.length - 1;
      if (lastIndex >= 0 && processedMessages[lastIndex].role === 'user') {
        const originalText = processedMessages[lastIndex].content;
        processedMessages[lastIndex] = {
          role: 'user',
          content: [
            { type: 'text', text: originalText },
            { type: 'image_url', image_url: { url: imageData } }
          ]
        };
      }
    }

    const payload = {
      messages: [dynamicSystemPrompt, ...processedMessages]
    };
    let response;

    try {
      if (!groqKey || groqKey === 'placeholder' || groqKey.trim() === '') {
        throw new Error("GROQ_API_KEY_MISSING");
      }
      // Attempt Groq Primary
      response = await attemptChatCompletion(payload, groqKey, 'https://api.groq.com/openai/v1', model, hasImage, maxTokens);
    } catch (groqError: any) {
      console.warn("Groq attempt failed, falling back to OpenRouter...", groqError?.message);

      try {
        if (!openRouterKey || openRouterKey === 'placeholder' || openRouterKey.trim() === '') {
          throw new Error("OPENROUTER_API_KEY_MISSING");
        }
      // Attempt OpenRouter Fallback
        response = await attemptChatCompletion(payload, openRouterKey, 'https://openrouter.ai/api/v1', model, hasImage, maxTokens);
      } catch (orError: any) {
        console.error("OpenRouter fallback failed.", orError?.message);
        return NextResponse.json({
          error: 'SERVICE_UNAVAILABLE',
          message: 'Both Groq and OpenRouter services are currently unavailable. Please try again later.'
        }, { status: 503 });
      }
    }

    if (!response) {
       return NextResponse.json({ error: 'No response from AI providers' }, { status: 500 });
    }

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          for await (const chunk of response as any) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              controller.enqueue(encoder.encode(content));
            }
          }
        } catch (err) {
          console.error("Streaming error:", err);
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
    console.error('CRITICAL_API_ERROR:', error);
    return NextResponse.json({ 
      error: 'INTERNAL_SERVER_ERROR', 
      message: error.message || 'An unexpected error occurred.' 
    }, { status: 500 });
  }
}
