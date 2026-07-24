# AgriSense V2 — Design Architecture

## 1. Document purpose

This document describes the design architecture implemented in [`agrisense-v2.html`](agrisense-v2.html). It is a self-contained, desktop-first interactive prototype for AgriSense AI: a field-management workspace for smallholder farmers in Bangladesh. It is not the production Next.js application; its role is to make the complete product narrative, visual language, interaction model, and state transitions inspectable in one file.

The design thesis is **The Grounded Field Notebook**: quiet agricultural utility, deep forest structure, paper-like surfaces, and a tightly reserved lime treatment for AI and high-commitment action. The interface makes field decisions, financial consequences, and supporting evidence visible together.

## 2. System at a glance

```text
HTML shell
├── SVG icon sprite
├── Persistent chrome
│   ├── Top bar: brand, mock-screen navigator, language/theme utilities
│   └── Field rail: farm context, fields, purchases, settings
└── Dynamic stage
    └── Screen registry (14 render functions)
        ├── Entry and farm selection
        ├── Conversational field intake and planning
        ├── Field workspace: overview / plan / money / trace
        ├── Replanning, checkout, and scenario simulation
        └── Reference: purchases, settings, tokens

Shared CSS tokens → component recipes → screen layouts
Shared local state + pure financial function → rendered decisions, diffs, and receipts
```

The prototype uses three layers:

| Layer | Responsibility | Implementation |
| --- | --- | --- |
| Foundations | Theme, typography, spacing, radius, focus treatment | CSS custom properties in `:root` |
| Components | Reusable visual and interaction patterns | CSS classes plus rendering helpers |
| Screens | Product flows and task-specific composition | `screen…()` functions registered in `SCREENS` |

## 3. Product and experience model

### Primary user

The experience serves a Bangladesh smallholder farmer managing a field through crop choice, season planning, inputs, water, risk, cost, and payment. Bengali is supported as a primary language treatment, with English available as a toggle. Amounts use Bangladeshi taka and tabular numerals; field units mix hectare and bigha where useful.

### Core UX principles

1. **One field is a living workspace.** Field identity, crop stage, plan, money, and conversation are different views of the same field state.
2. **The agent is accountable.** Recommendations expose named tool calls, inputs, outputs, status, duration, source, and expandable raw evidence.
3. **A field record is visible memory.** Conversational intake simultaneously fills a structured record rather than implying persistence only through chat history.
4. **Farmers can write back.** Editable quantities, area, logs, scenarios, and payment approval visibly alter downstream information.
5. **Side effects require a gate.** Payment moves through basket → explicit approval → debit status → receipt; the agent never implies that a charge happened automatically.
6. **Numbers come from a single calculation path.** Financial totals, scenario differences, and comparisons are derived by `computeFinancials()` instead of prose estimates.

## 4. Information architecture

### Global shell

| Region | Purpose | Key behavior |
| --- | --- | --- |
| Top bar | Global orientation and prototype navigation | Sticky 56px bar; horizontally scrollable screen pills; language and theme controls |
| Field rail | Farm and field context | 64px icon rail expands to 240px on hover or pin; exposes fields, purchases, and settings |
| Stage | Current task view | Scrollable canvas with a 1440px max-width content frame |
| SVG sprite | Icon source | Inline symbols prevent icon-network dependencies for the UI chrome |

The top bar and rail are product chrome. The mock-screen navigator is prototype tooling, not a production navigation recommendation.

### Screen registry

| # | Screen | Job to be done | Main composition |
| --- | --- | --- | --- |
| 01 | Login | Identify the farmer | Narrow phone-number card and explicit demo note |
| 02 | Farm | Choose or create a field | Three-up field cards: active, historical/read-only, new field |
| 03 | Intake | Gather structured field context | Conversational panel + live field-record panel |
| 04 | Planning | Compare crop choices and confirm one | Chat-led recommendation, crop cards, comparison table, evidence panel |
| 05 | Overview | See the field’s next decisions | Identity strip, crop-stage strip, dashboard grid, chat and supporting cards |
| 06 | Plan | Follow season actions by date | Timeline, plan tasks, weather/risk context, explanation patterns |
| 07 | Money | Inspect and edit cost/profit assumptions | Ledger, financial headline, editable input rows, area stepper |
| 08 | Trace | Audit recommendation provenance | Full trace presentation and classification legend |
| 09 | Replan | Record an event and re-evaluate the plan | Agent conversation plus plan/financial impact |
| 10 | Checkout | Approve and simulate a CaaS debit | Basket, approval gate, progress state, receipt, ledger impact |
| 11 | Scenario | Evaluate a constrained alternative | Same financial model, before/after diff, supporting rationale |
| 12 | Purchases | Review transactions | Edge-to-edge transaction table with receipt entry point |
| 13 | Settings | Set farm preferences | Compact settings card for phone, farm name, language, units, theme |
| 14 | Tokens | Inspect the design reference | Token swatches, type roles, and component samples |

## 5. Design foundations

### 5.1 Color architecture

The prototype mirrors the AgriSense design tokens in CSS. `light-dark()` preserves a paired light/dark semantic value, while the HTML `data-theme` attribute controls the active `color-scheme`.

| Token family | Light / dark value | Meaning and intended use |
| --- | --- | --- |
| `--canvas` | `#F7F9F4` / `#12160D` | Application ground |
| `--surface` | `#FFFFFF` / `#1B2114` | Cards, panels, top bar, rail |
| `--surface-muted` | `#F1F5EC` / `#232B1A` | Quiet contrast, agent bubbles, hover/secondary areas |
| `--forest-accent` | `#294719` / `#8FB56B` | Structure, selected navigation, focused controls, user chat bubble |
| `--positive-green` | `#6B8547` | Healthy/completed state |
| `--warning-orange` | `#EF8844` | Attention and warning state |
| `--ai-soft-lime` | `#F7FFD2` / `#2E3312` | AI/evidence container |
| `--ai-lime` → `--ai-yellow` | `#E0FF20` → `#FFFF00` | Primary CTA gradient only |
| `--ink` families | Dark olive / pale paper pairs | Primary, secondary, tertiary, and disabled reading hierarchy |
| `--border-*` families | Light/dark neutral pairs | Structural separation and emphasis |

**One Lime Rule.** Lime is not a general accent. It appears in the primary CTA family, current crop-stage marker, selected decision state, and AI/evidence highlight treatment.

### 5.2 Trace color semantics

Trace color is functional taxonomy, not decoration.

| Token/class | Tool class | Meaning |
| --- | --- | --- |
| `--trace-memory` / `field` | Field state | Stored field or conversation memory |
| `--trace-external` / `external` | Live data | External API or service result |
| `--trace-retrieval` / `retrieval` | Knowledge base | Retrieved source material |
| `--trace-deterministic` / `deterministic` | Computation | Rules, tables, and pure functions |
| `--trace-side-effect` / `gated` | Side effect | Human-approved action such as a charge |

### 5.3 Typography

The intended type family is **Overused Grotesk** for display, body, and labels. Because this standalone mock cannot load the self-hosted product files, it places Hanken Grotesk as its loadable fallback and adds Hind Siliguri for Bengali text.

| Role | Implementation | Use |
| --- | --- | --- |
| Display / heading | `--f-display`, 700–800, tight tracking | Screen titles, field identity, financial headline |
| Body | `--f-body`, 400 | Recommendations and explanatory content |
| Supporting | 12.5px, secondary ink | Metadata, trace timing, sources, helper copy |
| Label | 11px, 600, uppercase, 0.09em tracking | Card headers, compact categories, control labels |
| Bengali | `--f-bn` / Hind Siliguri | Bengali strings and bilingual content |

The global `font-variant-numeric: tabular-nums` rule stabilizes money, dates, and quantities for comparison.

### 5.4 Spatial architecture

The spacing scale is 4px-based: `4, 6, 8, 12, 16, 20, 24, 32, 40px`. Common working rhythm is 16px for card padding and grid gaps, 12px for compact groups, and 8px or lower for dense metadata.

| Token | Value | Common use |
| --- | --- | --- |
| `--r-inner` | 6px | Small controls and focused detail |
| `--r-element` | 8px | Buttons, inputs, badges, trace rows |
| `--r-container` | 12px | Cards, panels, message bubbles, larger modules |
| `--topbar-h` | 56px | Persistent global chrome |
| `--rail-w-collapsed` / `--rail-w-expanded` | 64px / 240px | Context-preserving field navigation |
| Stage frame | max 1440px | Desktop content boundary |

Depth is tonal and border-led. Regular cards are flat; the selected-card state uses an inset positive-green ring. Drop shadows are intentionally absent.

## 6. Component architecture

### Core primitives

| Component | Anatomy and state | Use rule |
| --- | --- | --- |
| Button | 36px high; primary gradient, secondary outlined, ghost text; 30px compact variant | Use primary only for the local decisive action |
| Utility button | 32px outlined compact control | Language and theme utilities |
| Icon button | 34px square, Element radius | Composer and small utility actions |
| Badge | Uppercase 10.5px label; green, AI, warning, neutral variants | Status or categorization, never visual filler |
| Chip | Full-pill choice; standard, dashed soft, recommended state | Intake choices, options, and comparisons |
| Card | Surface, 1px subtle border, 12px radius | Discrete dashboard widgets and bounded decisions |
| Row list | Edge-to-edge rows divided by subtle borders | Dense data inside a single card; never card each row |
| Input | 38px high, Element radius, forest focus border | Editable farm data and settings |
| Tabs | Bottom border, forest active underline, disabled unavailable state | Overview / plan / money view selection |

### Complete UI component inventory

This is the canonical inventory of the visual components defined by the mock’s CSS and screen renderers. Sub-elements are documented with their parent rather than treated as separate components.

#### Application shell and navigation

| Component | Anatomy | Variants / states | Behavior and placement |
| --- | --- | --- | --- |
| App shell | `.appshell` → `.topbar` + `.shellbody` | Full-height application frame | Root container for every screen |
| Top bar | Brand mark, mock navigation, utility group | Sticky, 56px high | Persistent global chrome; 20px horizontal padding |
| Brand mark | Forest 26px “A” glyph + wordmark | Static | Product identity at the top-left |
| Mock navigation | `.metanav` and `.mpill` screen pills | Current pill uses forest fill; overflow scrolls horizontally | Prototype-only access to all 14 screens |
| Utility controls | `.util-btn` language and theme controls | Default, hover, pressed | Bordered 32px controls; theme updates `data-theme`; language swaps mapped copy |
| Field rail / side panel | Farm header, field section, utility section, pin action | 64px collapsed, 240px hover-expanded or pinned | Persistent field context; hides only for non-product reference/login screens |
| Farm header | Avatar, farm name, location | Collapsed labels are visually hidden; visible on expansion | Establishes current farm ownership and geography |
| Rail item | Icon, label, optional crop-stage dot | Default, hover, selected/current, completed stage | Selected item uses soft-green fill, forest text, and 3px left marker |
| Rail pin | Pin icon + label | `aria-pressed` false/true | Makes the expanded rail width persistent for the current mock session |
| Stage | `.stage` → `.stage-inner` | Scrollable canvas; max 1440px content frame | Hosts the current screen without moving global chrome |
| Stage caption | Eyebrow, heading, supporting description | Standard header composition | Explains each prototype screen and its product rationale |

#### Content containers and selection controls

| Component | Anatomy | Variants / states | Behavior and placement |
| --- | --- | --- | --- |
| Card | `.card`, optional header/body | Standard; selected inset ring; dashed new-field card | Base container for widgets, settings groups, and bounded decisions |
| Card header/body | `.card-head` / `.card-body` | Header has 16/16/8px padding; body completes 16px inset | Gives a card a compact label and calm reading space |
| Card grid | `.card-grid`, `.tri`, `.hero-card` | Two-column, three-column, full-row hero | Dashboard and farm-selection composition |
| Row list | `.rowlist` and `.row` | Last row drops divider | Dense, edge-to-edge data inside one card |
| Button | `.btn` | Primary, secondary, ghost, small, block, disabled | 36px standard action; primary is reserved for a local decisive action |
| Icon button | `.icon-btn` | Default, hover | Compact 34px utility action such as microphone |
| Chip | `.chip` | Default, soft/dashed, recommended | Candidate answers, filters, and choice confirmation; pill radius only here |
| Badge | `.badge` | Green, AI, warning-soft, warning-solid, neutral | Compact status marker with uppercase label styling |
| Input and field label | `.field-lbl` + `.input` | Normal, focus, static display-like input | 38px form control; focus ties to forest accent |
| Tabs | `.tabs` + `.tab` | Default, hover, selected, disabled | Workspace view switching; active state is a forest bottom rule |
| Stepper | `.stepper`, value, minus/plus buttons | Default, hover control | Small numerical adjustment for field area or other scalar inputs |

#### Field workspace and planning components

| Component | Anatomy | Variants / states | Behavior and placement |
| --- | --- | --- | --- |
| Field identity strip | Field name plus location, area, soil, water facts | Populated vs. empty fact; hover edit hint | Immediately beneath workspace header; the mutable field record summary |
| Crop-stage strip | Crop/date heading, 6px track, fill, labelled stage markers | Future, done, current | Current marker is lime with a soft-green halo; done markers are positive green |
| Timeline | `.tl` vertical rule + `.tl-i` entries | Default, done, current, shifted | Dated season plan; shifted items use external-data blue |
| Alert | Icon + title + body | Informational, risk-low, risk-mid, risk-hi | Explains weather, risk, or consequential conditions without becoming a generic toast |
| Invariant indicator | `.invariant` icon plus compact text | Static proof note | Marks a design/logic guarantee alongside a calculation or plan |
| Plan task / log entry | Timeline or row-level action with supporting metadata | Done, current, future, re-planned | Couples recommended field work to an explicit date and status |

#### Conversation, agent, and evidence components

| Component | Anatomy | Variants / states | Behavior and placement |
| --- | --- | --- | --- |
| Chat panel | `.chatpanel`, scroll area, chip row, composer | 640px standard / 760px tall | Bounded agent workspace; one column of the desktop split |
| Message | `.msg` → author label + `.bubble` | User/right/forest; assistant/left/muted | Preserves authorship and separates input from recommendation |
| Composer | Suggestion chips, pill field, microphone, send button | Static placeholder in this mock | Fixed bottom area of the chat panel; send is forest-filled and circular |
| Trace summary | Chevron, colored taxonomy dots, label | Closed/open | Compact disclosure before the related assistant message |
| Trace block | Individual trace steps | Hidden/open; step statuses ok/fallback/running | Expands into tool-level accountability data |
| Trace step | Class dot, tool name, milliseconds, status, input/output, source | Field, external, retrieval, deterministic, gated; success/fallback/running | Smallest inspectable unit of agent provenance |
| Raw payload | `.rawtoggle` + `.rawbox` | Closed/open | Optional compact raw response inspection with 180px max height |
| Why panel | Lime trigger + provenance rows | Closed/open | Local explanation for one recommendation; displays source and taxonomy icon |
| Provenance row | Taxonomy marker, bold claim fragment, source line | Five trace classes | Human-readable evidence detail; not a separate global toast or modal |
| Pulse dot | Orange animated dot | Running only | Signals a pending operation alongside text that names the operation |

#### Money, payment, comparison, and reference components

| Component | Anatomy | Variants / states | Behavior and placement |
| --- | --- | --- | --- |
| Ledger table | `.ledger` header, item/basis/amount cells, sum row | Standard; editable row; struck-through prior value | Costs, comparisons, purchases, and related financial records |
| Financial headline | `.headline`, component rows, net emphasis, footer | Forest surface with white type | Decision-level summary of total, revenue, profit, and ROI |
| Scenario diff table | `.diff` base/now columns | Up/forest result, down/orange result, prior struck through | Shows a constrained scenario against the live plan |
| Human-in-the-loop gate | `.hitl` heading, amount, recipient, line items, approve action | Awaiting approval; blocked balance; submitted | High-salience payment boundary before a charge can occur |
| Receipt | `.receipt-h` and `.receipt-b` with key/value rows | Completed simulator receipt | Shows amount, transaction IDs, timestamp, and simulator mode |
| Key/value list | `.kv` label/value rows | Default; last row removes border | Receipt and structured factual detail presentation |
| Token swatch | `.swatch` fill and label | One per token | Design-reference page only; documents palette role and custom property |
| Type specimen row | `.typerow` role label + example | Display, heading, body, support, label, Bengali | Design-reference page only; documents actual type hierarchy |

### Signature components

#### Field identity strip

Field name is followed by editable context facts: location, area, soil, and water source. Edit affordances appear on hover, keeping the default reading state calm while signalling that field details are mutable.

#### Crop stage strip

A linear season track communicates crop, day/total days, percentage, and stage markers. Completed stages are Positive Green; the current stage is lime with a soft-green halo; remaining stages are border-only. The visual marker is always accompanied by text.

#### Conversation panel

The chat panel is a bounded operational surface, not a full-screen messenger. User messages are forest-filled; assistant messages are muted-surface. The composer uses a pill field, microphone control, and forest send button. Suggested chips sit above the composer.

#### Explainability stack

1. **Trace summary** — compact, collapsible count of tool calls with colored taxonomy dots.
2. **Trace step** — tool name, status, duration, input, output, source, and optional raw payload.
3. **Why panel** — local explanation disclosure that connects a statement to one or more provenance rows.

The trace is shown before or adjacent to the recommendation it supports, not isolated in a developer-only view.

#### Financial headline and ledger

The financial headline uses a forest surface to establish the decision-level total. Supporting rows show cost, revenue, net, and ROI. The ledger is a compact table; editable rows reveal an affordance on hover and cause downstream values to recalculate.

#### Human-in-the-loop payment gate

The `hitl` module has a distinct lime border and AI-soft-lime base, then shows amount, recipient/context, line items, and an explicit approve action. It is visually separated from ordinary recommendations because it represents a real-world side effect.

## 7. Layout patterns and responsive behavior

### Desktop workspace pattern

The primary workspace layout is `worksplit`:

```text
Desktop (above 1180px)
┌───────────────────────────┬────────────────────────────────────┐
│ Chat / agent panel        │ Field record, plan, money,         │
│ min 400px / 42%           │ evidence, or action-specific cards │
└───────────────────────────┴────────────────────────────────────┘
```

The overview uses a dashboard grid; the plan uses timeline-centric cards; money uses a ledger plus summary; checkout and scenario use a wide working area with a 380px supporting pane.

### Implemented responsive behavior

There is one explicit breakpoint:

```css
@media (max-width: 1180px) {
  .worksplit { grid-template-columns: 1fr; }
}
```

At ≤1180px, the chat/working panel and supporting pane stack. Top navigation can scroll horizontally, and many component groups wrap. The stage and field rail remain desktop-oriented; this file does **not** currently contain a complete mobile navigation or compact-phone layout specification. Any production implementation should add deliberate breakpoints for rail behavior, touch targets, long Bangla strings, tables, stage labels, and checkout actions.

## 8. Interaction and state architecture

### State model

`state` is a single in-memory object. It represents prototype state only and is reset on page refresh.

| State concern | Examples |
| --- | --- |
| Global preferences | `screen`, `theme`, `lang`, `pinned` |
| Field and intake | district/soil confidence, chosen crop, cycle planning state |
| Financial controls | area, Urea override, scenario run |
| Agent and payment flows | replan state, balance status, checkout step |

### Render loop

```text
User action
  → event handler updates state
  → render()
      → selected screen function produces stage markup
      → mock nav is rebuilt
      → rail is rebuilt and active state applied
      → language-specific labels are applied
```

Navigation uses a `SCREENS` registry and `go(screen)` function. Arrow Left/Right moves through the mock-screen sequence when focus is not in a text field.

### Deterministic financial model

`computeFinancials(areaHa, overrides)` is the prototype’s key source of numerical truth. It combines:

- fixed per-hectare input rates;
- base yield and weather adjustment;
- paddy price;
- optional per-line cost/yield overrides.

The same function powers crop comparison, money totals, editable Urea impact, and the constrained-budget scenario. This is a deliberate design mechanism: a user should see one consistent model re-run, not multiple conflicting “AI estimates.”

### Key flows

| Flow | State transition | Design outcome |
| --- | --- | --- |
| Intake | District/soil/water/budget answers fill the field record | Memory becomes a visible artifact |
| Crop choice | Select crop → compare → confirm plan | Recommendation becomes a farmer-approved plan |
| Money edit | Change input price or area | Ledger and headline update from the same calculation source |
| Replan | Log water/fertilizer event | Agent response and changed plan are shown as a scoped consequence |
| Checkout | Gate → balance check → direct debit → receipt | Side effect is explicit, traceable, and replayable |
| Scenario | Run constrained financial model | Before/after table exposes trade-offs rather than an opaque answer |

## 9. Accessibility and inclusion

### Present in the prototype

- Light/dark mode uses semantic `color-scheme` and semantic paired tokens.
- Keyboard-visible focus has a 2px forest outline.
- Buttons are real `<button>` elements in most interactive cases.
- Tabs expose `role="tab"` and `aria-selected`.
- Pinned rail exposes `aria-pressed`; selected navigation exposes `aria-current`.
- Numeric values are tabular for faster, more reliable comparison.
- Bengali font and language switching are considered in the visual system.
- Status frequently combines color with text, labels, or icons.

### Gaps to resolve before production

- Some interactive cards and trace summaries are clickable `<div>` elements, so they lack native keyboard behavior and semantics.
- Tabs do not implement the complete tablist/panel relationship or arrow-key behavior.
- Language switching only replaces elements carrying `data-en`/`data-bn`; much of the mock content remains English.
- The 1180px stacked split is not enough for mobile-first usage; the rail and dense tables require a true small-screen strategy.
- Inputs use visual labels in many places, but label/input associations and error descriptions need implementation-level verification.
- Dynamic state changes should announce meaningful updates through accessible status patterns in the production application.

## 10. Implementation boundaries

This document records what the HTML prototype does and does not establish.

| Established | Not established by the prototype |
| --- | --- |
| Token vocabulary and color roles | Production token build pipeline |
| Visual component behavior and variants | React/Astryx component API implementation |
| Screen-level information architecture | Real routing, persistence, authentication, and API contracts |
| Financial interaction model | Validated live financial data or backend calculation integration |
| Agent trace presentation | Actual streaming, provenance storage, and error/retry behavior |
| Checkout gate and receipt pattern | Live bdapps credentials or money movement |
| Light/dark visual intent | Full device and browser test matrix |

The Google Fonts dependency is a mock-only fallback. The production app uses self-hosted Overused Grotesk; that production source remains the typography authority.

## 11. Design guardrails for future work

1. Use the named semantic tokens; do not introduce screen-specific hex colors.
2. Keep lime reserved for AI/highlight and primary-commitment actions.
3. Prefer surface layering and subtle borders to decorative shadows.
4. Keep dense data in rows and tables, not a field of nested cards.
5. Pair every consequential recommendation with reachable evidence, source, trace, or deterministic basis.
6. Use trace classes consistently: memory, external, retrieval, deterministic, and gated side effect.
7. Maintain the distinction between a recommendation and an action that requires human approval.
8. Design Bengali and small-screen states intentionally; wrapping alone is not a responsive strategy.
9. Preserve the one-model principle: all views of a financial or agronomic decision must use the same underlying calculation.
10. Treat the mock navigator and inline prototype controls as documentation tools, not automatic production UI requirements.

## 12. Source map

| Concern | Source area in `agrisense-v2.html` |
| --- | --- |
| Token declarations, type, shell, components | CSS at the start of the file |
| Responsive behavior | Single `@media (max-width:1180px)` rule |
| Iconography | Inline SVG symbol sprite |
| Financial source model | `RATES`, yield/price constants, `computeFinancials()` |
| State and trace helpers | `state`, trace class maps, `traceSummary()`, `whyPanel()` |
| Screen UI architecture | `screenLogin()` through `screenTokens()` |
| Routing and chrome | `SCREENS`, `go()`, `renderMetaNav()`, `renderRail()`, `render()` |
| Global interactions | pin, language, theme, and arrow-key handlers |

## 13. Maintenance notes

When this mock changes, update this document if any of the following change: token names or values, screen registry, component variants, layout breakpoints, trace taxonomy, interaction state, financial calculation inputs, or the checkout gate. Keep the description factual: label prototype-only behavior clearly and do not promote static mock content into a product guarantee.
