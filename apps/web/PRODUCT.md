# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**One audience: the smallholder farmer in Bangladesh.** Mobile-first, phone-number identified (no OTP), Bengali-first UI (`lang="bn"` default, English secondary). Managing one active field's season end to end: crop choice, sowing timing, fertilizer/water budgeting, pest risk, and whether the numbers leave a profit.

Hackathon judges are **not** a second design target. This is evaluated live in a ~4-minute demo (see Operating Context), but judges score by asking "does this genuinely work for the farmer" — they inhabit the farmer's perspective rather than bringing a separate one. Design decisions are made for the farmer, full stop; there is no tradeoff to arbitrate between "legible to a judge" and "usable by a farmer," because the former is a consequence of doing the latter well, not a competing requirement.

## Product Purpose

AgriSense AI gives every field a living plan — costed, weather-aware, source-cited — that the farmer and an AI agent maintain together from empty ground to harvest. Not a chatbot and not a static dashboard: a workspace per field whose state an agent maintains, which the farmer can also edit directly, and either action triggers a re-plan. Success means the six dependent decisions the problem statement names — crop → sowing date → fertilizer → water → pest risk → cost/profit — are answered, chained, and visibly grounded in real weather, real agronomic sources, and deterministic cost tables, never invented numbers.

## Positioning

Two mechanisms a chatbot or a static farm-record dashboard can't truthfully claim:

1. **Every recommendation traces its provenance.** The exact tool call, source, and retrieved data behind a claim renders inline as an expandable trace — never asserted in prose alone.
2. **Several dashboard cards are write channels, not displays.** A farmer's edit to water, fertilizer, or budget triggers a scoped re-plan, and the agent responds unprompted with what changed and why.

The edit-and-replan loop is the specific, demonstrable mechanism the product is betting the "Innovation" and "Agentic behaviour" rubric points on — not a general claim of being "AI-powered."

## Operating Context

- Bengali-first UI (`lang="bn"` default; English available); phone number as the sole identifier — OTP is explicitly out of scope (see Capabilities and Constraints).
- Deliberately narrow scope: one user, one farm, one active field plus one seeded historical (read-only) field, one crop cycle, one conversation. Not a limitation to design around expanding.
- Field data covers 5 crops (Boro/Aman/Aus rice, potato, maize), Bangladesh only, sourced from BARC FRG-2018, IRRI Rice Knowledge Bank, BBS, and USDA FAS.
- Payment: bdapps CaaS in simulator mode by default — contract-accurate (real endpoint shapes, real status codes), not a stub. Live credentials are an optional upgrade, not the demo path: bdapps whitelists by originating IP, and venue Wi-Fi will likely fail with `E1303`.
- Evaluated live in a ~4-minute demo in front of judges, immediately followed by Q&A that references the trace and the README.
- **Build window: approximately 15 hours remaining as of this record (24 July 2026).** Every design decision must be executable in that window — ambition that can't ship in time is the wrong choice, explicitly, not a compromise.

## Capabilities and Constraints

- Astryx (`@astryxdesign/core`) is the component library, themed via a custom FarmEsy theme (`theme/farmesy.theme.ts`) built from Astryx's own token defaults — no pre-built Astryx theme (e.g. theme-matcha) is used.
- Next.js App Router (`apps/web`) + Express/MVC backend (`apps/api`) over SSE, for streaming chat and inline tool-call traces.
- In scope: conversational intake with gap detection, live weather grounding (Open-Meteo), ranked crop recommendations, a dated season plan, a financial projection with live-editable inputs, explained reasoning (provenance on every recommendation), RAG-backed knowledge-base citations, a visible agent trace, persistent field memory, proactive weather-triggered advice, fertilizer/irrigation scheduling with organic alternatives, predictive pest/disease risk, scenario simulation ("what if"), and bdapps CaaS checkout simulation.
- Explicitly out of scope, by deliberate decision: OTP verification, multi-session chat, satellite/NDVI imagery, IoT sensors, real money movement, a marketplace, image-based diagnosis, voice interaction, offline mode.
- Terminology: a **Field** is the core workspace unit (a Farm can hold multiple Fields); a **CropCycle** is one planting-to-harvest cycle within a Field.

## Brand Commitments

FarmEsy visual identity is locked and already implemented — binding for this and future design work, not open for reinterpretation:

- Primary/action color: deep green `#294719`. Secondary/positive: `#6B8547`. Lime `#E0FF20` is reserved specifically as an AI/highlight accent, distinct from the general button accent.
- Surfaces: canvas `#F7F9F4`, card `#FFFFFF`, secondary surface `#F1F5EC`.
- Typeface: "Overused Grotesk" (self-hosted; font files not yet added, currently falls back to Inter).
- Team/submission: Anti-b2b SaaS Club, product name AgriSense AI.

## Evidence on Hand

- Real, cited knowledge-base sources already collected: IRRI Rice Knowledge Bank, BARC FRG-2018 (English); two further corpus sources partially collected.
- Real financial sanity anchor from the team's own research: Boro HYV BCR ~1.9–2.3 on ~৳89–97k/ha cost against ~৳164–209k/ha gross return (Chanda et al. 2019).
- Founder-authored feature-architecture sketch (`Docs/WhatsApp Image 2026-07-24 at 15.17.39.jpeg`) — primary evidence for the accessibility/mobile-first requirement below.
- **Absences future work must not fabricate:** no customer testimonials, press, case studies, or user research exist. No live bdapps credentials are confirmed working — simulator mode is the documented, sanctioned default.

## Product Principles

1. Never render a number the model invented. Every figure traces to a deterministic table, a live API, or a cited retrieval; RAG holds "why/how" prose only, never a dose, date, or price.
2. Depth of interaction beats breadth of surface. A few cards a farmer can write to, that visibly trigger a re-plan, prove more agency than many read-only ones.
3. Every recommendation is explainable on demand. Provenance (source, method, reference) is structural data on every tool result, not a prompt-engineered claim.
4. Design for the farmer, not the judge watching. A judge scores by asking whether this would genuinely work for a farmer — there is one bar to clear, not two to balance.
5. Ship the guaranteed core clean before reaching for margin. Feasibility inside the remaining build window overrides ambition at every decision point.

## Accessibility & Inclusion

Paramount, per explicit founder direction, weighted equally across two dimensions:

1. **Audience-specific:** low-literacy-tolerant, icon-forward and number-forward over dense text; mobile-first, assuming one-handed use and patchy rural connectivity; Bengali as the default script.
2. **Standard practice:** WCAG-level contrast, tap-target sizing, and keyboard/screen-reader support apply in full — not waived because the audience-specific need is the headline concern.
