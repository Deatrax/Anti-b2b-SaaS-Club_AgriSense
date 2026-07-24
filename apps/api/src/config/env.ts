// Environment, validated at boot — fail fast (§C.3). Keys are OPTIONAL so the scaffold
// boots without them; anything that needs a key throws a clear error at call time.
import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),

  // LLM (agent loop) — OpenAI primary, Anthropic optional failover (§1.8 override)
  ANTHROPIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  LLM_MODEL: z.string().default('gpt-4o'),
  EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),

  // Database — Supabase Postgres connection string
  DATABASE_URL: z.string().optional(),

  // Weather — Open-Meteo (keyless)
  OPEN_METEO_BASE_URL: z.string().default('https://api.open-meteo.com/v1'),

  // bdapps CaaS — simulated by default (sanctioned by the brief)
  CAAS_MODE: z.enum(['simulated', 'live']).default('simulated'),
  BDAPPS_BASE_URL: z.string().default('https://developer.bdapps.com'),
  BDAPPS_APPLICATION_ID: z.string().optional(),
  BDAPPS_PASSWORD: z.string().optional(),
});

export const env = schema.parse(process.env);
export type Env = typeof env;
