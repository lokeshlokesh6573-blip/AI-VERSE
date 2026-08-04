// ─── Message Types ────────────────────────────────────────────────────────────

export type MessageRole = 'user' | 'assistant';

export interface FileAttachment {
  type: 'image' | 'text';
  data: string;    // base64 for image, raw text for text files
  name: string;
  mimeType?: string;
}

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  attachment?: FileAttachment;
  isStreaming?: boolean;
  isError?: boolean;
  originalContent?: string;
  isPinned?: boolean;
}

// ─── AI Model Configs ─────────────────────────────────────────────────────────

export interface AIModel {
  id: string;
  name: string;
  description: string;
  contextWindow: number;
  supportsVision: boolean;
  isDefault?: boolean;
  speed: 1 | 2 | 3 | 4 | 5;         // 5 = fastest
  intelligence: 1 | 2 | 3 | 4 | 5;  // 5 = most capable
  useCase: string;                   // best use case
  cost: 'Free' | 'Low' | 'Medium' | 'High';
  badge?: string;                    // e.g. 'Vision', 'Fastest'
}

export const AI_MODELS: AIModel[] = [
  {
    id: 'llama-3.3-70b-versatile',
    name: 'Llama 3.3 70B',
    description: 'Most capable — ideal for complex tasks',
    contextWindow: 128000,
    supportsVision: false,
    isDefault: true,
    speed: 3,
    intelligence: 5,
    useCase: 'Complex reasoning, code, research',
    cost: 'Free',
    badge: 'Best IQ',
  },
  {
    id: 'llama-3.2-11b-vision-instruct',
    name: 'Llama 3.2 11B Vision',
    description: 'Vision + text — analyzes images',
    contextWindow: 128000,
    supportsVision: true,
    speed: 4,
    intelligence: 4,
    useCase: 'Image analysis, OCR, screenshots',
    cost: 'Free',
    badge: 'Vision',
  },
  {
    id: 'llama-3.1-8b-instant',
    name: 'Llama 3.1 8B Instant',
    description: 'Lightning fast — great for quick questions',
    contextWindow: 128000,
    supportsVision: false,
    speed: 5,
    intelligence: 3,
    useCase: 'Quick answers, everyday chat',
    cost: 'Free',
    badge: 'Fastest',
  },
  {
    id: 'mixtral-8x7b-32768',
    name: 'Mixtral 8x7B',
    description: 'Strong reasoning & multilingual',
    contextWindow: 32768,
    supportsVision: false,
    speed: 3,
    intelligence: 4,
    useCase: 'Reasoning, multilingual chat',
    cost: 'Free',
  },
  {
    id: 'gemma2-9b-it',
    name: 'Gemma 2 9B',
    description: 'Google\'s efficient instruction-tuned model',
    contextWindow: 8192,
    supportsVision: false,
    speed: 4,
    intelligence: 3,
    useCase: 'Efficient, focused instruction',
    cost: 'Free',
  },
];

// ─── Chat API Payload ─────────────────────────────────────────────────────────

export interface ChatAPIPayload {
  messages: Array<{ role: string; content: string | any[] }>;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  responseStyle?: 'concise' | 'detailed';
  hasImage?: boolean;
  imageData?: string;
}

// ─── Web Search ───────────────────────────────────────────────────────────────

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

// ─── Capability Modes ─────────────────────────────────────────────────────────

export type CapabilityMode =
  | 'chat'
  | 'code'
  | 'write'
  | 'research'
  | 'image'
  | 'data';
