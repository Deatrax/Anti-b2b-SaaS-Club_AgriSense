# AGENTS.md

Project-specific guidance for AI coding agents.

<!-- ASTRYX:START -->
Astryx v0.1.8 · 153 components
CLI: run every command as `npx astryx <cmd>` (shown below as `astryx ...`).

SETUP (once, in your app entry e.g. main.tsx) — without these, components render unstyled:
  import "@astryxdesign/core/reset.css";
  import "@astryxdesign/core/astryx.css";

WORKFLOW — discover, don't guess. Before writing UI:
1. `astryx build "<idea>"` — START HERE: returns a kit (closest [page] + [block]s + [component]s). No args = full playbook.
2. `astryx template <name> [--skeleton]` — scaffold the [page]/[block]s it named, or study their layout. Templates are reference code.
3. `astryx component <Name>` — props + examples for every component you use.

RULES:
- No <div> — components do all layout/spacing. Full page → AppShell; sidebar nav → SideNav.
- Frame first: pick the shell (AppShell / Layout+LayoutPanel) and budget regions in px BEFORE writing content (`astryx docs layout`).
- Dense data = rows (Table, List/Item) edge-to-edge — never Card-wrapped list items. Card = dashboard widgets, galleries, settings groups only.
- Status → StatusDot/Token; Badge only for counts and enumerated states, never decoration.
- Custom styling: component props first; else Tailwind utilities backed by tokens (bg-surface, text-primary, rounded-lg) via tailwind-theme.css. No raw hex/px.
- Tokens for every value (`astryx docs tokens`). Brand/accent via `astryx theme` — never override --color-* in :root.
- SELF-CHECK before you finish: re-read the file and replace any style={{…}}, raw <div>/<span> layout, imported .css/@apply, or hardcoded/arbitrary value (e.g. bg-[#fff], p-[13px]) with the component or a token-backed utility. If unsure a component/prop exists, run `astryx component <Name>` / `astryx search "<thing>"`; don't hand-roll CSS.

MORE CLI:
  search "<query>"   find any component / hook / doc / template / block
  component --list   153 components by category
  template --list    page + block recipes
  docs <topic>       color, elevation, icons, illustrations, internationalization, layout, migration, motion, principles, shape, spacing, styling, theme, tokens, typography
  swizzle <Name>     eject component source for deep customization
  upgrade --apply    run after any @astryxdesign/core bump
<!-- ASTRYX:END -->

## AgriSense project context

Themed with FarmEsy tokens via `theme/farmesy.theme.ts` (no base theme package — see the theme file's header comment). Per-screen component choices are mapped in `../../Docs/AgriSense_Astryx_Inventory.md`. Build order and the full component/file tree are in `../../Docs/AgriSense_AI_Blueprint_v3.md` §C.3 and §C.10.

`components/astryx/` holds swizzled (ejected) source for every component named in the inventory, for deep customization. **Default to importing from `@astryxdesign/core/<Name>` (the installed package), not from `components/astryx/`.** The package ships pre-compiled output that just works; the swizzled source is raw, uncompiled StyleX (`stylex.create()`) and this app has no StyleX build step configured, so it renders unstyled with no error if imported as-is. It is also **excluded from `tsconfig.json`** (see `exclude`) because as-swizzled it does not type-check: several modules (`Table`, `Chat`, `Layout`, `TabList`, `Text`, `Toolbar`, `Dialog`, `SideNav`, and others — confirmed via `tsc --noEmit`, 404 errors across 34 of the 36 swizzled dirs) import internal package modules that aren't part of `@astryxdesign/core`'s public surface (`@astryxdesign/core/BaseProps`, un-exported types like `StyleXStyles`/`TextDisplay` from `@astryxdesign/core/theme`) or reference sibling files that weren't copied over (e.g. `../Tooltip/Tooltip`). Treat these as a reference/starting point, not drop-in code: before actually using one, expect to fix its internal imports and wire up a StyleX compiler (`astryx docs styling-libraries`, Next.js + StyleX example app). Swizzled files no longer receive updates from `astryx upgrade` either way.

