import { settingsService } from '../settings-service.js';
import { log } from '../logger.js';

interface DeepSeekMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface DeepSeekRequest {
  model: string;
  messages: DeepSeekMessage[];
  stream: boolean;
  temperature?: number;
  max_tokens?: number;
}

interface DeepSeekStreamChoice {
  delta: { content?: string };
  finish_reason: string | null;
}

interface DeepSeekStreamChunk {
  choices: DeepSeekStreamChoice[];
}

export class DeepSeekClient {
  private apiKey: string | null = null;
  private model: string = 'deepseek-v4-flash';

  async init(): Promise<boolean> {
    const key = await settingsService.get('ai_api_key');
    const model = await settingsService.get('ai_model');
    if (key && typeof key === 'string' && key.trim()) {
      this.apiKey = key.trim();
    }
    if (model && typeof model === 'string' && model.trim()) {
      this.model = model.trim();
    }
    return !!this.apiKey;
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  async *streamChat(messages: DeepSeekMessage[], options?: { temperature?: number; max_tokens?: number }): AsyncGenerator<string, void, unknown> {
    if (!this.apiKey) {
      await this.init();
      if (!this.apiKey) {
        throw new Error('AI API Key not configured. Please set it in Settings.');
      }
    }

    const body: DeepSeekRequest = {
      model: this.model,
      messages,
      stream: true,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.max_tokens ?? 2000,
    };

    log.info('deepseek_request', { model: this.model, messageCount: messages.length });

    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      log.error('deepseek_error', { status: response.status, error: errorText });
      throw new Error(`DeepSeek API error (${response.status}): ${errorText}`);
    }

    if (!response.body) {
      throw new Error('DeepSeek API returned no response body');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;

          const data = trimmed.slice(6);
          if (data === '[DONE]') return;

          try {
            const chunk: DeepSeekStreamChunk = JSON.parse(data);
            const content = chunk.choices?.[0]?.delta?.content;
            if (content) {
              yield content;
            }
          } catch {
            // skip malformed JSON lines
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  async chat(messages: DeepSeekMessage[], options?: { temperature?: number; max_tokens?: number }): Promise<string> {
    let result = '';
    for await (const chunk of this.streamChat(messages, options)) {
      result += chunk;
    }
    return result;
  }
}

export const deepseekClient = new DeepSeekClient();
