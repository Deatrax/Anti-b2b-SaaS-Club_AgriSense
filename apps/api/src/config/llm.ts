// LLM provider + failover (§C.5). Default: Anthropic Claude (Opus 4.8, §1.8).
// Failover: OpenAI, only if OPENAI_API_KEY is present.
import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import { env } from './env';

/** Primary reasoning model for the agent loop (services/agent/orchestrator.ts). */
export function primaryModel() {
  if (!env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not set — the agent loop needs it (.env).');
  }
  return anthropic(env.LLM_MODEL);
}

/** Optional failover model (§C.5 "second provider key"). Returns null if unconfigured. */
export function failoverModel() {
  if (!env.OPENAI_API_KEY) return null;
  return openai('gpt-4o');
}
