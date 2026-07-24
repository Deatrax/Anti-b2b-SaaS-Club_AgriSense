// FarmEsy design tokens mapped onto Astryx's stock semantic token set.
// Token names verified against `astryx docs tokens` / `astryx docs theme` (v0.1.8).
// Full palette sourced from Docs/AgriSense_Wireframe.html (the canonical FarmEsy
// reference). Mostly plain token substitution; two spots (the primary button and
// the crop-stage progress fill) use defineTheme's `components` field because the
// wireframe's gradients can't be expressed as a single token value — still purely
// color/background treatments, nothing about layout, spacing, or behavior changed.
import {defineTheme} from '@astryxdesign/core/theme';

export default defineTheme({
  name: 'farmesy',
  tokens: {
    // surfaces (page -> surface/card -> secondary)
    '--color-background-body': '#F7F9F4',
    '--color-background-surface': '#FFFFFF',
    '--color-background-card': '#FFFFFF',
    '--color-background-muted': '#F1F5EC',

    // brand accent — deep-green is FarmEsy's dominant accent (icons, headers,
    // secondary borders). Primary CTA buttons override to the lime→yellow
    // gradient below (components.button); this token is what CTA text sits on
    // wherever the gradient override doesn't apply (e.g. focus rings).
    '--color-accent': '#294719',
    '--color-on-accent': '#FFFFFF',

    // secondary/positive brand green
    '--color-success': '#6B8547',
    '--color-on-success': '#FFFFFF',

    // status warning
    '--color-warning': '#EF8844',
    '--color-warning-muted': '#FFF2E8',
    '--color-on-warning': '#182014',

    // text (3 of FarmEsy's 4 tiers map onto Astryx's 3 text-color slots;
    // tertiary is kept as a custom extra token in globals.css)
    '--color-text-primary': '#182014',
    '--color-text-secondary': '#596452',
    '--color-text-disabled': '#ABB2A5',

    // borders (FarmEsy's `divider` is close enough to `subtle` to share it —
    // Astryx components don't expose a third border slot)
    '--color-border': '#E4E9DF',
    '--color-border-emphasized': '#CCD6C4',
    '--shadow-inset-selected': 'inset 0px 0px 0px 2px rgba(107, 133, 71, 0.16)',

    // progress/slider track — FarmEsy's border-subtle, matching the wireframe's
    // slider/progress unfilled-track color exactly
    '--color-track': '#E4E9DF',

    // Card/Badge "green" variant, retinted from Astryx's default to FarmEsy's
    // soft-green surface + deep-green text (matches .pill.mem, .fin .headline,
    // .rank .opt.top in the wireframe)
    '--color-background-green': '#EBF3E1',
    '--color-border-green': '#6B8547',
    '--color-icon-green': '#294719',
    '--color-text-green': '#294719',

    // Card/Badge "yellow" variant, repurposed as FarmEsy's lime/AI-highlight
    // family: soft-lime surface + forest text (matches .aicard, .cur-badge,
    // .glance .next .tag in the wireframe)
    '--color-background-yellow': '#F7FFD2',
    '--color-border-yellow': '#6B8547',
    '--color-icon-yellow': '#17310F',
    '--color-text-yellow': '#17310F',

    // radius — Astryx's own defaults (inner 4 / element 8 / container 12) already
    // match FarmEsy's md/lg exactly; only the button radius (FarmEsy sm = 6px)
    // needs an explicit override, since Astryx's inner default (4px) is FarmEsy's xs.
    '--radius-inner': '6px',
    '--radius-element': '8px',
    '--radius-container': '12px',

    // type
    '--font-family-body': '"Overused Grotesk", Inter, "Helvetica Neue", Arial, sans-serif',
    '--font-family-heading': '"Overused Grotesk", Inter, "Helvetica Neue", Arial, sans-serif',

    // FarmEsy tokens with no Astryx system slot are NOT set here: defineTheme's
    // `tokens` is typed to Astryx's closed TokenName union, so arbitrary custom
    // vars don't type-check in this file. They're declared as plain CSS custom
    // properties in app/globals.css instead, scoped the same way Astryx scopes
    // its own theme tokens ([data-astryx-theme="farmesy"]). See globals.css for:
    // brand-lime, brand-yellow, text-tertiary, surface-green-soft,
    // surface-lime-soft, and the five trace-class colors (memory/external/
    // retrieval/deterministic/side).
  },

  components: {
    // Primary CTA — wireframe: .btn.primary{background:linear-gradient(90deg,
    // #E0FF20 0%,#FFFF00 100%);color:var(--brand-forest);font-weight:600}
    button: {
      'variant:primary': {
        backgroundImage: 'linear-gradient(90deg, #E0FF20 0%, #FFFF00 100%)',
        color: '#17310F',
      },
    },
    // Crop-stage progress fill — a green→lime gradient in the same spirit as the
    // wireframe's brand-green slider fill, adapted for a determinate progress bar.
    'progressbar-fill': {
      base: {
        backgroundImage: 'linear-gradient(90deg, #6B8547 0%, #E0FF20 100%)',
      },
    },
  },
});
