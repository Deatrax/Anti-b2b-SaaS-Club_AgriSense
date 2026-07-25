// LLM provider + failover (§C.5). Primary: OpenAI (§1.8 override — no Anthropic key on
// hand at build time; recorded in .claude/CLAUDE.md §1.8). Failover: Gemini first (key on
// hand), then Anthropic if that key is ever added.
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { openai } from '@ai-sdk/openai';
import type { LanguageModel } from 'ai';
import { env } from './env';

/** Primary reasoning model for the agent loop (services/agent/orchestrator.ts). */
export function primaryModel(): LanguageModel {
  if (!env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set — the agent loop needs it (.env).');
  }
  return openai(env.LLM_MODEL);
}

/** Optional failover model (§C.5 "second provider key"). Returns null if unconfigured. */
export function failoverModel(): LanguageModel | null {
  if (env.GOOGLE_GENERATIVE_AI_API_KEY) {
    // @ai-sdk/google is still on the old LanguageModelV1 provider spec (confirmed 2026-07-25:
    // 4.0.24, its latest published version, has never adopted V2+) while `ai` is on v7, which
    // expects V2/V3/V4. Not a version we can "upgrade" out of — cast narrowly here rather than
    // widen types elsewhere. If this path ever actually runs, verify it against a live call.
    return google(env.GEMINI_MODEL) as unknown as LanguageModel;
  }
  if (env.ANTHROPIC_API_KEY) return anthropic('claude-opus-4-8');
  return null;
}
