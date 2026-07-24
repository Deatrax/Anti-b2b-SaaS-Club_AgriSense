-- 001_init.sql — AgriSense schema (§C.4). Supabase Postgres + pgvector.
-- Run: npm run migrate  (apps/api/src/db/migrate.ts applies this file).

create extension if not exists vector;
create extension if not exists "pgcrypto";

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  phone text unique not null, name text, lang text default 'bn',
  created_at timestamptz default now()
);

create table if not exists farms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  name text,                                    -- "হাসানের খামার"
  district text, lat double precision, lon double precision, aez int,
  created_at timestamptz default now()
);

create table if not exists fields (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid references farms(id) on delete cascade,
  name text, area_ha numeric,
  soil_type text, water_source text,
  lat double precision, lon double precision, budget_bdt numeric,
  created_at timestamptz default now(), updated_at timestamptz default now()
);

create table if not exists crop_cycles (
  id uuid primary key default gen_random_uuid(),
  field_id uuid references fields(id) on delete cascade,
  crop text, variety text, season text,
  sowing_date date, expected_harvest date,
  status text default 'planned',                -- planned|active|harvested
  stage text, day_index int, actual_yield_kg numeric,
  created_at timestamptz default now()
);

create table if not exists season_plans (
  id uuid primary key default gen_random_uuid(),
  crop_cycle_id uuid references crop_cycles(id) on delete cascade,
  revision int default 1,
  weather_snapshot jsonb,                       -- reproducibility
  generated_at timestamptz default now()
);

create table if not exists plan_events (
  id uuid primary key default gen_random_uuid(),
  crop_cycle_id uuid references crop_cycles(id) on delete cascade,
  stage_key text, title text, action text,
  quantity numeric, unit text,
  planned_date date, actual_date date,
  status text default 'pending',                -- pending|done|skipped|shifted
  shift_reason text, sources jsonb, sort_order int
);

create table if not exists ledger_entries (
  id uuid primary key default gen_random_uuid(),
  crop_cycle_id uuid references crop_cycles(id) on delete cascade,
  kind text,                                    -- cost|revenue
  item text, qty numeric, unit text, unit_cost numeric, total numeric,
  source text, assumption text,
  is_actual boolean default false,
  occurred_on date, transaction_id uuid
);

create table if not exists risk_windows (       -- T1 pest gap
  id uuid primary key default gen_random_uuid(),
  crop_cycle_id uuid references crop_cycles(id) on delete cascade,
  pest text, level text,                        -- low|elevated|high
  starts_on date, ends_on date,
  trigger jsonb,                                -- {temp_c:[28,32], rh:88}
  prevention text, treatment text, est_cost_bdt numeric,
  sources jsonb
);

create table if not exists scenario_runs (      -- T1 scenario gap
  id uuid primary key default gen_random_uuid(),
  crop_cycle_id uuid references crop_cycles(id) on delete cascade,
  label text, constraint_json jsonb, overrides jsonb,
  result jsonb, diff jsonb,
  created_at timestamptz default now()
);

create table if not exists field_logs (
  id uuid primary key default gen_random_uuid(),
  field_id uuid references fields(id) on delete cascade,
  crop_cycle_id uuid references crop_cycles(id),
  kind text,                                    -- irrigation|fertilizer|pest|observation
  payload jsonb, logged_by text default 'farmer',
  occurred_at timestamptz default now()
);

create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  field_id uuid references fields(id) on delete cascade,
  title text, created_at timestamptz default now()
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete cascade,
  role text, content text, tool_calls jsonb,
  is_proactive boolean default false,
  created_at timestamptz default now()
);

create table if not exists traces (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete cascade,
  message_id uuid references messages(id),
  step int, tool text, tool_class text,
  params jsonb, result jsonb,
  source text, status text, duration_ms int,
  created_at timestamptz default now()
);

create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  field_id uuid references fields(id),
  external_trx_id text unique,                  -- idempotency key
  internal_trx_id text, reference_id text,
  amount_bdt numeric, msisdn text,
  status text, mode text,                       -- live|simulated
  request_payload jsonb, response_payload jsonb,
  approved_at timestamptz,                       -- HITL gate
  created_at timestamptz default now()
);

create table if not exists kb_chunks (
  id uuid primary key default gen_random_uuid(),
  content text, source text, reference text,
  crop text, section text, lang text,
  embedding vector(1536)
);

create index if not exists kb_chunks_embedding_idx
  on kb_chunks using ivfflat (embedding vector_cosine_ops) with (lists = 20);
create index if not exists plan_events_cycle_date_idx on plan_events (crop_cycle_id, planned_date);
create index if not exists traces_conv_step_idx on traces (conversation_id, step);
