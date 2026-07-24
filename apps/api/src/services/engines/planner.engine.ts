// engines/planner.engine.ts — PURE. Calendar = lookup (crop_rules windows/durations) + date math.
export interface PlanInput {
  // TODO: crop, sowingDate, stage_durations, fertilizer splits, weather (for shift rules).
  [k: string]: unknown;
}

export function buildPlan(_input: PlanInput): unknown {
  // TODO: emit dated PlanEvents (land prep → sowing → fertilizer splits → irrigation → pest checks → harvest).
  throw new Error('buildPlan not implemented');
}
