// Season plan, plan events, and pest/disease risk windows (§B.3, §C.4).
import type { Provenance } from './tool';

export type PlanEventStatus = 'pending' | 'done' | 'skipped' | 'shifted';

export interface PlanEvent {
  id: string;
  cropCycleId: string;
  stageKey: string;
  title: string;
  action: string | null;
  quantity: number | null;
  unit: string | null;
  plannedDate: string | null;
  actualDate: string | null;
  status: PlanEventStatus;
  /** "this date moved, and here's the trigger value" (§B.3 plan_events.shift_reason). */
  shiftReason: string | null;
  sources: Provenance[];
  sortOrder: number;
}

export interface SeasonPlan {
  id: string;
  cropCycleId: string;
  revision: number;
  /** Reproducibility — any plan can be replayed exactly, months later (§B.3). */
  weatherSnapshot: unknown;
  generatedAt: string;
  events: PlanEvent[];
}

export type RiskLevel = 'low' | 'elevated' | 'high';

/** Tier-1 pest/disease risk (§A.1 gap): forward-looking, from stage × weather. */
export interface RiskWindow {
  id: string;
  cropCycleId: string;
  pest: string;
  level: RiskLevel;
  startsOn: string | null;
  endsOn: string | null;
  /** e.g. { temp_c: [28, 32], rh: 88 } */
  trigger: unknown;
  prevention: string | null;
  treatment: string | null;
  estCostBdt: number | null;
  sources: Provenance[];
}
