import { chatCompletion, type ProviderConfig, type ChatRequest } from './base';

const config: ProviderConfig = {
  name: 'groq',
  apiKey: process.env.GROQ_API_KEY || '',
  baseURL: 'https://api.groq.com/openai/v1',
  models: {
    default: 'llama-3.3-70b-versatile',
    vision: 'llama-3.2-11b-vision-instruct',
  },
};

export async function groqChat(request: ChatRequest): Promise<ReadableStream | null> {
  if (!config.apiKey || config.apiKey === 'placeholder' || !config.apiKey.trim()) {
    return null;
  }

  try {
    return await chatCompletion(config, request);
  } catch (err: any) {
    console.warn('[Groq] Failed:', err?.message);
    return null;
  }
}

export { config as groqConfig };
