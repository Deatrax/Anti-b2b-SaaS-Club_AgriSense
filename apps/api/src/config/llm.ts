// LLM provider + failover (§C.5). Primary: OpenAI (§1.8 override — no Anthropic key on
// hand at build time; recorded in .claude/CLAUDE.md §1.8). Failover: Anthropic, if configured.
import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import { env } from './env';

/** Primary reasoning model for the agent loop (services/agent/orchestrator.ts). */
export function primaryModel() {
  if (!env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set — the agent loop needs it (.env).');
  }
  return openai(env.LLM_MODEL);
}

/** Optional failover model (§C.5 "second provider key"). Returns null if unconfigured. */
export function failoverModel() {
  if (!env.ANTHROPIC_API_KEY) return null;
  return anthropic('claude-opus-4-8');
}
