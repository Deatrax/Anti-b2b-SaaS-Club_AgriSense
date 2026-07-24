---
name: "AgriSense AI"
description: "A calm, evidence-led farm workspace for Bangladesh's smallholder farmers."
colors:
  canvas: "light-dark(#F7F9F4, #12160D)"
  surface: "light-dark(#FFFFFF, #1B2114)"
  surface-muted: "light-dark(#F1F5EC, #232B1A)"
  forest-accent: "light-dark(#294719, #8FB56B)"
  on-forest-accent: "#FFFFFF"
  positive-green: "#6B8547"
  warning-orange: "#EF8844"
  warning-muted: "light-dark(#FFF2E8, #3A2415)"
  ink: "light-dark(#182014, #F1F5EC)"
  ink-secondary: "light-dark(#596452, #AEB8A0)"
  ink-tertiary: "light-dark(#87907F, #7A8370)"
  ink-disabled: "light-dark(#ABB2A5, #5B6350)"
  border-subtle: "light-dark(#E4E9DF, #2B3323)"
  border-strong: "light-dark(#CCD6C4, #3B4530)"
  soft-green: "light-dark(#EBF3E1, #1E2A16)"
  ai-soft-lime: "light-dark(#F7FFD2, #2E3312)"
  ai-lime: "#E0FF20"
  ai-yellow: "#FFFF00"
  trace-memory: "#6B8547"
  trace-external: "light-dark(#2F7BC4, #6BADEB)"
  trace-retrieval: "light-dark(#294719, #8FB56B)"
  trace-deterministic: "light-dark(#BA7517, #E0A94A)"
  trace-side-effect: "#EF8844"
typography:
  display:
    fontFamily: '"Overused Grotesk", Inter, "Helvetica Neue", Arial, sans-serif'
  body:
    fontFamily: '"Overused Grotesk", Inter, "Helvetica Neue", Arial, sans-serif'
  label:
    fontFamily: '"Overused Grotesk", Inter, "Helvetica Neue", Arial, sans-serif'
rounded:
  inner: "6px"
  element: "8px"
  container: "12px"
components:
  button-primary:
    backgroundColor: "linear-gradient(90deg, #E0FF20 0%, #FFFF00 100%)"
    textColor: "{colors.ink}"
    rounded: "{rounded.element}"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.container}"
  badge-green:
    backgroundColor: "{colors.soft-green}"
    textColor: "{colors.forest-accent}"
    rounded: "{rounded.element}"
  badge-ai:
    backgroundColor: "{colors.ai-soft-lime}"
    textColor: "{colors.ink}"
    rounded: "{rounded.element}"
---

## Overview

**Creative North Star: "The Grounded Field Notebook."** AgriSense is a calm operational workspace, not a futuristic agriculture dashboard. It pairs paper-light surfaces and deep plant greens with a single vivid lime signal for AI assistance, so field decisions feel practical, traceable, and immediately actionable.

The UI is Bengali-first, mobile-first, icon- and number-forward, and deliberately legible for low-literacy-tolerant use. Evidence is visible in the interface: recommendations, live weather, deterministic figures, citations, and agent tool calls should read as one accountable system.

**Key Characteristics:**

- Quiet agricultural utility: pale canvas, white working surfaces, restrained borders.
- Forest-green structure: trusted navigation, icons, headings, and positive agronomic state.
- Lime AI signal: reserved for intelligence, highlights, and the primary call to action—not general decoration.
- Explainable operations: cards can be both summaries and editable controls; agent trace is first-class UI.

**The Evidence-in-the-Interface Rule.** Do not present a recommendation or a consequential number as an unexplained assertion. Make its source, method, or trace reachable in the same working context.

## Colors

The frontmatter is the normative palette. It intentionally preserves the implementation's `light-dark()` values so the same semantic token works in both modes.

### Primary

Forest Accent carries application structure and dependable action: use it for icons, headings, secondary borders, and the standard accent state. Positive Green represents healthy, completed, or agronomically sound status. The primary CTA is exceptional: it uses the AI Lime → AI Yellow gradient rather than a solid forest fill, with dark ink for readable label text.

### Supporting & Status

Soft Green is the quiet positive container. AI Soft Lime is the light AI/evidence container. Warning Orange and Warning Muted communicate attention without turning the workspace alarmist. Status colors must retain their semantic role; do not use warning or trace colors as decoration.

### Neutrals

Canvas provides the page field; Surface and Surface Muted establish working layers; Ink, Ink Secondary, Ink Tertiary, and Ink Disabled establish reading hierarchy. Border Subtle separates by structure, while Border Strong is reserved for emphasis or selected boundaries.

### Trace Classes

Agent trace has a stable, semantic classification: memory, external data, retrieval, deterministic calculation, and side effect. Preserve that meaning whenever a trace is rendered; the colors are recognition aids, not a rainbow palette.

**The One Lime Rule.** AI Lime is reserved for AI/highlight emphasis and the primary-gradient family. It must not become a general secondary button, random chart, or decorative accent color.

## Typography

**Display Font:** Overused Grotesk, with Inter, Helvetica Neue, Arial, and sans-serif fallbacks. The family is self-hosted in weights 300, 350, 400, 500, 600, 700, 800, and 900, with matching italics. Use the same family for headings and body so the interface remains compact and coherent across Bengali and English content.

**Character:** friendly but practical grotesk typography. The system values fast scanning of dates, money, crop stages, and evidence over editorial flourish. Tabular numerals are enabled globally for reliable comparison of financial and farm values.

### Hierarchy

- **Display / heading:** use Astryx heading roles for page and field identity; render in Ink and favor concise labels.
- **Body:** use Astryx body role for instructions, recommendations, and readable explanatory copy.
- **Supporting:** use Astryx supporting role in Ink Secondary for timestamps, source metadata, trace parameters, and helper text.
- **Label:** use Astryx label role with medium or semibold emphasis for controls, status names, and card titles.

Do not invent a competing type scale. Astryx owns the inherited size and leading scale; AgriSense owns the family, hierarchy, and semantic color assignment.

**The Scan-Then-Read Rule.** Put the decision, amount, date, or status in the fastest-scanning type treatment; place explanation and provenance in supporting text directly beneath or behind an intentional disclosure.

## Layout

Use Astryx layout primitives rather than ad-hoc boxes. The core workspace is an `AppShell` with a persistent field rail, top navigation, and a scrollable operational canvas. Within a workspace, organize information as stacked field identity, crop-stage/status strip, tabs, responsive card grid, and conversation/trace area.

The visual rhythm is Astryx's tokenized spacing scale. In the implemented field workspace, primary content commonly uses a 3-step group gap and padding, a 2-step internal card gap, and 1–1.5-step compact metadata/status gaps. Preserve that density: small enough for operational scanning, with clear separation between task groups.

Mobile is the default constraint. Prefer single-column reading order, wrapped status rows, large native controls, and concise labels. Do not depend on hover to reveal required information; keyboard and touch users need the same available actions.

## Elevation & Depth

AgriSense is tonal-layered and nearly flat at rest. Canvas, white surface, muted surface, and subtle borders do the structural work; cards should not float merely because they are cards. The only explicit AgriSense depth token is the selected inset ring, which uses a 2px translucent positive-green inset stroke. Astryx may apply its inherited low/medium elevation where a component has an established interaction pattern (for example, an elevated composer), but do not add custom drop shadows to ordinary content.

**The Flat-by-Default Rule.** Use surface contrast and borders to group information. Reserve elevation for floating, transient, or directly manipulated controls.

## Shapes

The system uses gently rounded rectangles rather than pills everywhere: Inner (6px) for compact controls, Element (8px) for buttons and inputs, and Container (12px) for cards and larger bounded regions. Full-round shapes are limited to their inherent component cases such as dots or compact badges.

Borders are quiet and thin. Use Border Subtle for ordinary separation, Border Strong for emphasis, and the selected inset ring for selection. Avoid heavy outlines, sharp rectangular controls, ornamental cut corners, or glass effects.

## Components

### Buttons

Buttons are clear, touchable commitments. Primary buttons carry the lime-to-yellow AI gradient with dark ink text and the Element radius; use them for the single most important action in a local context. Secondary buttons use the inherited neutral/surface treatment. Ghost buttons keep chrome minimal for utility actions such as language and theme controls. Preserve Astryx hover, active, and keyboard-visible focus behavior.

### Cards / Containers

Cards are white or dark-surface operational modules with Container radius and restrained internal spacing. Use a card for a dashboard widget, a contained decision, a setting group, or a distinct editable control. Do not wrap dense lists or table rows in individual cards; use Astryx List, Item, or Table patterns edge-to-edge.

### Inputs / Fields

Inputs use the Element radius, surface background, and quiet border treatment. Keep labels explicit and visible; touch-driven users must not infer a field's purpose from placeholder text. Focus must remain visibly tied to the forest-accent family.

### Navigation

Navigation is structural, not promotional. The field rail identifies the current field and top navigation hosts global utilities such as Bengali/English and light/dark mode. Active and current states must remain legible without relying on hue alone.

### Agent Trace

Agent trace is a signature component. Render tool calls as a compact named row with status, target/input, duration when available, and an expandable result/source detail. Classify its color by tool role and never replace a pending tool call with a bare spinner; name the operation and its input.

### Progress & Crop Stage

Crop-stage progress uses the Positive Green → AI Lime gradient, while its unfilled track uses Border Subtle. Pair the visual state with status text so progression remains understandable to color-blind users and in low-quality displays.

## Do's and Don'ts

### Do:

- **Do** use the AgriSense semantic tokens and `light-dark()` pairs rather than hard-coded per-screen colors.
- **Do** use Overused Grotesk throughout and preserve tabular figures for money, dates, and quantities.
- **Do** keep the AI Lime gradient for the primary CTA and AI/highlight family.
- **Do** use Astryx primitives for layout, spacing, controls, tables, and accessibility behavior.
- **Do** make source, trace, and state visible near decisions that affect a field plan or money.
- **Do** make touch targets, Bengali-first copy, icons, and numbers work together for one-handed mobile use.

### Don't:

- **Don't** turn the interface into a generic analytics dashboard with decorative charts, excessive shadows, or a rainbow status palette.
- **Don't** use raw hex values or create a second visual token system in individual screens.
- **Don't** use lime as a general decoration or as a substitute for semantic status.
- **Don't** hide required information behind hover-only interactions or rely on color alone to convey state.
- **Don't** present model-invented figures or recommendations without their deterministic, live, or cited basis.
- **Don't** card-wrap dense lists, tables, or every small fragment of information.
