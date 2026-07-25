# AntiB2B_AgriSense

> ⚠️ **Rename before submission** to `AntiB2B_AgriSense` (rule: `TeamName_AgriSense`).
> Current git remote is `AgriSense_by_Anti-b2b-SaaS-Club`.

**AgriSense AI** — an agent that takes a farmer from an empty field to a costed,
weather-aware, source-cited season plan, and keeps advising through harvest.

_bdapps Agentic AI Hackathon · IUT 12th ICT Fest · Team: Anti-b2b SaaS Club — Obidit · Mahim · Masnun_

---

## Data model

```
User → Farm → Field → CropCycle → { SeasonPlan · PlanEvents · LedgerEntries · RiskWindows · ScenarioRuns }
                     ↳ FieldLogs · Conversation( messages · traces )
```

## What it does

AgriSense AI is not just a standard chatbot, but an intelligent workspace tailored for agricultural fields. It gives farmers a dedicated workspace where the AI agent maintains and manages the state of their fields. The farmer can talk to the agent naturally or edit field parameters directly; either action seamlessly triggers a grounded re-plan of their entire season. It provides a costed, weather-aware, source-cited, and highly contextual season plan, continuing to offer insights and advice all the way through to harvest.

## Architecture
```
apps/web (Next.js 16)  ⇄  SSE  ⇄  apps/api (Express, MVC, Vercel AI SDK)
                                      └─ hand-rolled tool loop (Vercel AI SDK primitives)
                                           ├─ external: Open-Meteo · bdapps CaaS (sim)
                                           ├─ retrieval: RAG (Supabase pgvector)
                                           └─ deterministic: financial · ranking · planner · pest engines
```

## Setup (must work from a clean clone)
```bash
npm install
cp .env.example .env          # fill OPENAI_API_KEY + DATABASE_URL (Supabase)
npm run migrate               # apply apps/api/src/db/migrations/001_init.sql
npm run ingest                # build KB embeddings offline (one-time)  [H8+]
npm run dev                   # api :4000 + web :3000
```

## Tools & APIs used
| Tool | Class | Source | Real or mock? |
|------|-------|--------|---------------|
| Open-Meteo forecast | external | api.open-meteo.com (keyless) | **Real** |
| Knowledge base (RAG) | retrieval | IRRI RKB, BARC FRG-2018, Banglapedia, BAMIS | **Real** (public sources) |
| Fertilizer / cost / calendar tables | deterministic | BARC FRG-2018, BBS, USDA FAS | **Real** (cited, `data/*.json`) |
| bdapps CaaS | gated | published contract, simulator mode | **Simulated** (sanctioned by brief) |
| SMS channel (`POST /agent/sms`) | channel adapter | called by the `farmer-sms-webhook` repo (bdapps SMS) | **Real** (real DB + RAG + LLM turn; bdapps SMS delivery itself lives in the webhook repo) |

## Knowledge base

The Knowledge Base is processed entirely offline (`npm run ingest`) into our vector database to ensure fast and deterministic lookups:
- **Sources**: IRRI Rice Knowledge Bank, Banglapedia (Asiatic Society of Bangladesh), BAMIS (Dept. of Agricultural Extension), and BARC Fertilizer Recommendation Guide (FRG) 2018.
- **Chunking Strategy**: Semantic-section chunking, targeting ~400 words (300–600 tokens) with ~15% overlap.
- **Embedding Model**: OpenAI `text-embedding-3-small` (1536-d vectors).
- **Retrieval**: Supabase `pgvector` with cosine distance and metadata pre-filtering (e.g., crop-specific vs general reference). See `apps/api/src/services/rag/`.

## Feature tier table
| Feature | Tier | Status |
|---------|------|--------|
| Conversational intake · weather · crop rec · season plan · financials · explainability · RAG · trace | 0 | scaffolded |
| bdapps CaaS checkout | scored (10 pts) | scaffolded (simulator) |
| Replan · scenario sim · pest risk | 1 | scaffolded |
| SMS channel adapter (`/agent/sms`) — single retrieve+completion, no tool loop, ≤280-char Bangla, <8s | 2 | working, measured live |

## What is real vs. generated

To maintain high trustworthiness and align with the hackathon brief:
- **Real & Live**: Open-Meteo weather integrations are real.
- **Real & Cited**: Knowledge Base (RAG) uses fully authentic, cited prose. Cost tables, fertilizer plans, and crop rules are static data derived from verifiable sources (BARC, BBS).
- **Simulated**: bdapps payment flows are simulated strictly against the real provided contract. 
- **Omitted by Design**: OTP is not built (the phone number is used as a plain identifier for this prototype phase).

## What we deliberately did not build, and why

Given the 24-hour hackathon constraint, we actively scoped out the following to focus on the core "Agentic AI" value prop:
- **OTP verification and multi-session auth**: Adds friction for demos, not demonstrating AI capabilities.
- **Image diagnosis**: Relying entirely on LLM vision API for generic diagnostics is imprecise and outside the core financial/planning focus.
- **Marketplace & Voice**: Great extensions but dilutes focus from our complex deterministic tools (financial engine, planner).

## Tests
`npm test` — the **financial engine** consistency suite (§C.9) is the one that scores:
change an input → every figure moves correctly.

## Team
- **Obidit** — AI architecture · agent core · prompts · eval design · scope arbiter
- **Mahim** — agent infra · tools · RAG · memory · deployment · repo health
- **Masnun** — frontend · trace/evidence panels · HITL UX · README · demo
