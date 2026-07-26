import { OpenAI } from 'openai';

export interface ProviderConfig {
  name: string;
  apiKey: string;
  baseURL: string;
  models: {
    default: string;
    vision: string;
  };
}

export interface ChatRequest {
  messages: any[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export async function chatCompletion(
  config: ProviderConfig,
  request: ChatRequest,
): Promise<ReadableStream> {
  const ai = new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
  });

  const model = request.model || config.models.default;

  const stream = await ai.chat.completions.create({
    model,
    messages: request.messages,
    stream: true,
    temperature: request.temperature ?? 0.7,
    top_p: 0.9,
    max_tokens: request.maxTokens ?? 2048,
  });

  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream as any) {
          const content = chunk.choices[0]?.delta?.content || '';
          if (content) controller.enqueue(encoder.encode(content));
        }
      } catch (err) {
        console.error(`[${config.name}] Stream error:`, err);
        controller.error(err);
      } finally {
        controller.close();
      }
    },
  });
}
