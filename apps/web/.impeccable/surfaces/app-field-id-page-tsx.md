---
version: 1
slug: "app-field-id-page-tsx"
primary_target: "app/field/[id]/page.tsx"
related_targets: []
---

# Field Workspace — Shell + Overview Tab

## Scope and visitor mode

Primary task surface of AgriSense AI: the workspace shell (rail, sticky state strip, tab switcher) and the Overview tab's pinned card set + unified feed below it. Mode: **Operate** — task completion and scanability outrank expression; brand lives in precise detail, not decoration.

Out of scope for this brief: Plan and Money tabs' specific card sets (separate `shape` passes), the `/demo` forced 3-column route, phone entry/intake.

## Audience, job, action/task, proof/content

One audience: the smallholder farmer in Bangladesh, mobile-first, Bengali-first, low-literacy-tolerant, one-handed use, patchy connectivity. Job: tell at a glance what's true about the field right now (crop stage, weather, next action, risk, budget), then understand *why* by reading downward — what changed, and what caused it.

This surface is evaluated live in a ~4-minute hackathon demo, but that is an operating-context fact, not a second design target (see `PRODUCT.md` § Users) — judges score by asking whether this genuinely works for a farmer, so there is one bar to clear.

Proof this surface must carry: every card update traces to a named tool call (provenance, not assertion), and editing water/fertilizer/budget visibly triggers the agent to reply unprompted with what moved and by how much — the specific mechanism the product claims over a chatbot or a static dashboard.

## Chosen direction

**Pinned state strip + unified causality feed**, within the existing locked FarmEsy/Astryx identity (no new visual world; this is an extension of an established world, not a concept tournament). A sticky header strip (identity + season progress + the 2–3 highest-priority live cards for the active tab) sits above one continuous chronological feed that interleaves chat turns, expandable tool-call trace blocks, and field-log edits.

This makes the page's literal structure a direct translation of the product's own definition of visible agency (`AgriSense_AI_Blueprint_v3.md` §A.2): *pinned state change, directly above its attributable cause.* Tabs (Overview/Plan/Money) re-filter which cards the strip pins — one structural pattern reused three ways, not three different layouts. Chosen over two alternatives: a conventional split two-pane (chat one side, cards the other — closer to the blueprint's original sketch, more building, less distinctive) and the plain category-standard card-grid-plus-chat-drawer (rejected as the unremarkable default).

Signature interaction / centerpiece: the water/fertilizer edit → replan loop. Farmer edits Water or Fertilizer (`NumberInput` inline in its feed card) → the edit posts as a feed item → a running trace block appears → the agent's unprompted reply lands as the next feed item, naming what changed and why → the relevant pinned strip card updates to match. All four steps visible in sequence, never collapsed or hidden behind a re-fetch.

## Scope and boundaries

- Untouchable: FarmEsy tokens (locked), Astryx component conventions from `apps/web/AGENTS.md` (no raw `<div>` layout, tokens over hex, discover via `astryx component <Name>` before writing).
- Anti-goal: a card grid that competes for attention with the feed below it — the state strip must read as *current fact*, not a second scrollable dashboard.
- Fidelity: implementation-ready, not exploratory — specific component choices below, minimal ambiguity left for build time (~15h total build window per `PRODUCT.md`).

## States and ranges

- **GATHERING (first-run):** state strip shows identity fields filling in one at a time as the farmer answers; NextSteps card is replaced by a compact "X fields remaining" indicator. First-class state, not an edge case.
- **Loading:** a tool call in flight shows as a running `ChatToolCalls` row inline in the feed (`Calling get_weather(lat=…)…`, never a bare spinner); a card whose data hasn't arrived yet shows `Skeleton`, not empty.
- **Fallback/error:** a failed external call (e.g. Open-Meteo timeout) renders as a visible `Banner` — warning color, states the fallback source and timestamp — inline in the feed, not swallowed silently.
- **Content ranges:** state strip pins 2–3 cards on Overview (NextSteps + Weather, Risk only when active); feed length is unbounded but the strip never requires scrolling to reach.

## Interaction and layout

Component choices per `Docs/AgriSense_Astryx_Inventory.md`:

- Rail: `SideNav` + `SideNavHeading`/`SideNavItem`.
- State strip: `IdentityStrip` via `MetadataList` (horizontal); `SeasonStrip` composed from `Stack` + `StatusDot` + `Text` + `Divider`; pinned cards use the shared `Card` + `Toolbar`-as-header shell.
- Tabs: `TabList` + `Tab`, driving which cards the strip pins — not a route change.
- Feed: `ChatLayout` + `ChatMessageList`; chat turns via `ChatMessage`/`ChatMessageBubble`; tool calls via `ChatToolCalls` (colored by `toolClass`, not status); field-log edit events render as feed-native cards using `NumberInput` for the editable value and `Item` for the resulting log line.
- Composer: `ChatComposer` + `ChatComposerInput` + `ChatSendButton`, persistent at the bottom; quick-reply chips via `ToggleButtonGroup`.
- Explainability: `[Why?]` opens a `Popover` rendering `MetadataList` (provenance) + `Citation` (source badges) — per-card, not just per-message.
- Responsive: strip and feed both single-column on mobile (the default, per accessibility priority); no two-pane split on this surface — that structure was the explicitly-declined runner-up.

## Constraints and open decisions

- Platform/accessibility: WCAG-level contrast and tap targets apply in full alongside the icon-forward, low-literacy design language — both binding, not traded off.
- Localization: Bengali-first (`lang="bn"`), all card copy needs an `en`/`bn` pair in `locales/`.
- Left for the builder to decide within these bounds: exact spacing/density values, which specific icons represent each status, whether the strip uses 2 or 3 pinned cards on a given viewport width.
- Not decided here, needs its own pass: Plan tab's timeline structure, Money tab's ledger/diff structure, the `/demo` route's forced layout (deliberately a *different* structure per the file tree, not this same pattern stretched wide).

## Status

Confirmed direction, 2026-07-24. **Build not started — awaiting explicit go-ahead.**
