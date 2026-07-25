# AntiB2B_AgriSense

> ⚠️ **Rename before submission** to `AntiB2B_AgriSense` (rule: `TeamName_AgriSense`).
> Current git remote is `AgriSense_by_Anti-b2b-SaaS-Club`.

**AgriSense AI** — an agent that takes a farmer from an empty field to a costed,
weather-aware, source-cited season plan, and keeps advising through harvest.

_bdapps Agentic AI Hackathon · IUT 12th ICT Fest · Team: Anti-b2b SaaS Club — Obidit · Mahim · Masnun_

---

## What it does
_TODO (H20): 3–4 sentences. Not a chatbot — a **workspace per field** the agent maintains.
The farmer can talk to it OR edit the field directly; either one triggers a grounded re-plan._

## Data model — User → Farm → Field → CropCycle  (put the diagram FIRST, §D.3)
```
User → Farm → Field → CropCycle → { SeasonPlan · PlanEvents · LedgerEntries · RiskWindows · ScenarioRuns }
                     ↳ FieldLogs · Conversation( messages · traces )
```

## Architecture
```
apps/web (Next.js 14)  ⇄  SSE  ⇄  apps/api (Express, MVC)
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
| Knowledge base (RAG) | retrieval | IRRI RKB, BARC FRG-2018 prose | **Real** (public sources) |
| Fertilizer / cost / calendar tables | deterministic | BARC FRG-2018, BBS, USDA FAS | **Real** (cited, `data/*.json`) |
| bdapps CaaS | gated | published contract, simulator mode | **Simulated** (sanctioned by brief) |
| _…_ | | | |

## Knowledge base
_TODO: sources, chunk count, embedding model (OpenAI `text-embedding-3-small`, 1536-d),
retrieval (pgvector cosine + metadata pre-filter). See `apps/api/src/services/rag/`._

## Feature tier table
| Feature | Tier | Status |
|---------|------|--------|
| Conversational intake · weather · crop rec · season plan · financials · explainability · RAG · trace | 0 | scaffolded |
| bdapps CaaS checkout | scored (10 pts) | scaffolded (simulator) |
| Replan · scenario sim · pest risk | 1 | scaffolded |

## What is real vs. generated
_TODO (required by the brief). Weather real; KB real+cited; cost tables static+cited;
payment simulated against the real contract; OTP not built (phone = plain identifier)._

## What we deliberately did not build, and why
_TODO (§D.2): OTP verification, multi-session auth, image diagnosis, voice —
named choices under a 24-hour constraint, not omissions. (Marketplace & supplier comparison
was added afterward — see `Docs/superpowers/specs/2026-07-25-marketplace-supplier-comparison-design.md`.)_

## Tests
`npm test` — the **financial engine** consistency suite (§C.9) is the one that scores:
change an input → every figure moves correctly.

## Team
- **Obidit** — AI architecture · agent core · prompts · eval design · scope arbiter
- **Mahim** — agent infra · tools · RAG · memory · deployment · repo health
- **Masnun** — frontend · trace/evidence panels · HITL UX · README · demo
