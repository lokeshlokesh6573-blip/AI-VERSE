import { groqChat } from './groq';
import { openRouterChat } from './openrouter';

export interface ProviderRequest {
  messages: any[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  hasImage?: boolean;
}

// Provider chain: Groq → OpenRouter → null (local fallback)
const providers = [
  { name: 'groq', handler: groqChat },
  { name: 'openrouter', handler: openRouterChat },
];

export async function routeRequest(request: ProviderRequest): Promise<{
  stream: ReadableStream | null;
  provider: string;
}> {
  for (const provider of providers) {
    const stream = await provider.handler(request);
    if (stream) {
      return { stream, provider: provider.name };
    }
  }

  return { stream: null, provider: 'local' };
}
