// Environment, validated at boot — fail fast (§C.3). Keys are OPTIONAL so the scaffold
// boots without them; anything that needs a key throws a clear error at call time.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';

// npm workspace scripts run with cwd = apps/api/, not the repo root, so the default
// `dotenv/config` (which reads cwd) misses the root .env. Resolve it explicitly instead.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadDotenv({ path: path.resolve(__dirname, '../../../../.env') });

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),

  // LLM (agent loop) — OpenAI primary; failover tries Gemini first, then Anthropic (§1.8 override)
  OPENAI_API_KEY: z.string().optional(),
  LLM_MODEL: z.string().default('gpt-4o'),
  EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default('gemini-3.6-flash'),
  ANTHROPIC_API_KEY: z.string().optional(),

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
