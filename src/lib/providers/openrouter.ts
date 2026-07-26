import { chatCompletion, type ProviderConfig, type ChatRequest } from './base';

const config: ProviderConfig = {
  name: 'openrouter',
  apiKey: process.env.OPENROUTER_API_KEY || '',
  baseURL: 'https://openrouter.ai/api/v1',
  models: {
    default: 'meta-llama/llama-3.1-8b-instruct',
    vision: 'meta-llama/llama-3.2-11b-vision-instruct',
  },
};

export async function openRouterChat(request: ChatRequest): Promise<ReadableStream | null> {
  if (!config.apiKey || config.apiKey === 'placeholder' || !config.apiKey.trim()) {
    return null;
  }

  try {
    return await chatCompletion(config, request);
  } catch (err: any) {
    console.warn('[OpenRouter] Failed:', err?.message);
    return null;
  }
}

export { config as openRouterConfig };
