// Rice growth stages (T. Aman demo crop). Stage DURATIONS live in data/crop_rules.json
// so this stays a pure vocabulary; the planner reads durations, not this list.

export const RICE_STAGES = [
  'land_prep',
  'nursery',
  'transplanting',
  'tillering',
  'panicle_initiation',
  'booting',
  'flowering',
  'grain_filling',
  'maturity',
  'harvest',
] as const;

export type RiceStage = (typeof RICE_STAGES)[number];
