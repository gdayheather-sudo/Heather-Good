import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

dotenv.config();

const RATE_LIMIT_MS = 1000; // 1000ms between Claude calls
const MAX_RETRIES = 3;

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export type ClaudeModel = 'sonnet' | 'haiku';

const MODEL_IDS: Record<ClaudeModel, string> = {
  sonnet: 'claude-sonnet-4-6',
  haiku: 'claude-haiku-4-5-20251001',
};

export class ClaudeClient {
  private client: Anthropic;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey || apiKey === 'your_anthropic_api_key_here') {
      throw new Error(
        'ANTHROPIC_API_KEY is not set in .env\n' +
        'Get your key at: https://console.anthropic.com'
      );
    }
    this.client = new Anthropic({ apiKey });
  }

  async complete(
    systemPrompt: string,
    userPrompt: string,
    model: ClaudeModel = 'sonnet',
    maxTokens = 4096
  ): Promise<string> {
    const modelId = MODEL_IDS[model];
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        await sleep(RATE_LIMIT_MS);

        const response = await this.client.messages.create({
          model: modelId,
          max_tokens: maxTokens,
          system: [
            {
              type: 'text',
              text: systemPrompt,
              // Enable prompt caching for the system prompt — reduces cost on repeated calls
              cache_control: { type: 'ephemeral' },
            },
          ],
          messages: [{ role: 'user', content: userPrompt }],
        });

        const content = response.content[0];
        if (content.type !== 'text') {
          throw new Error('Unexpected response type from Claude');
        }
        return content.text;
      } catch (err) {
        lastError = err as Error;
        if (attempt < MAX_RETRIES) {
          const backoff = attempt * 2000;
          console.warn(`  ⚠ Claude call failed (attempt ${attempt}/${MAX_RETRIES}), retrying in ${backoff}ms...`);
          await sleep(backoff);
        }
      }
    }

    throw new Error(`Claude call failed after ${MAX_RETRIES} attempts: ${lastError?.message}`);
  }

  async completeJson<T>(
    systemPrompt: string,
    userPrompt: string,
    model: ClaudeModel = 'sonnet',
    maxTokens = 4096
  ): Promise<T> {
    const raw = await this.complete(systemPrompt, userPrompt, model, maxTokens);

    // Strip markdown code fences if Claude wrapped the JSON
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/, '')
      .trim();

    try {
      return JSON.parse(cleaned) as T;
    } catch {
      throw new Error(`Failed to parse Claude JSON response:\n${cleaned.slice(0, 500)}`);
    }
  }
}
