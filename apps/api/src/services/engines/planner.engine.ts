// engines/planner.engine.ts — PURE. Calendar = lookup (crop_rules windows/durations) + date math.
// Assumes a nursery→transplant crop like rice (matches the only crop in crop_rules.json today
// and the demo's T. Aman scope, §1.8). Direct-seeded crops (potato/maize) will need this
// generalized once their data lands — not built speculatively ahead of that data existing.
import type { PlanEvent, PlanEventStatus, Provenance } from '@agrisense/shared';

export const POST_TRANSPLANT_STAGES = ['tillering', 'panicle_initiation', 'booting', 'flowering', 'grain_filling', 'maturity'] as const;
export type Stage = 'nursery' | (typeof POST_TRANSPLANT_STAGES)[number];

/** Documented assumption: land prep starts a week before nursery sowing. Not sourced — no
 * crop_rules.json field gives a prep lead time. */
const LAND_PREP_LEAD_DAYS = 7;
/** Skip near-zero irrigation checkpoints rather than clutter the calendar. */
const IRRIGATION_EVENT_THRESHOLD_MM = 5;

export interface FertilizerSplit {
  stage: string;
  fraction: number;
}

export interface FertilizerNutrient {
  /** kg/ha for the whole season. */
  dose: number;
  splits: FertilizerSplit[];
}

export interface PlanInput {
  areaHa: number;
  /** ISO YYYY-MM-DD — nursery sowing date. */
  sowingDate: string;
  stageDurationsDays: Record<Stage, number>;
  /** From crop_rules.json's calendar.transplant_window — preferred over a computed date. */
  transplantWindowStart: string;
  /** From crop_rules.json's calendar.harvest_window. */
  harvestWindowStart: string;
  /** Keyed by nutrient symbol (N/P/K/S) as crop_rules.json uses. */
  fertilizer: Record<string, FertilizerNutrient>;
  /** Net irrigation mm per stage, pre-aggregated by the tool layer from irrigation.engine's
   * daily output — this engine does no aggregation, only placement on the calendar. */
  irrigationByStage?: Partial<Record<Stage, number>>;
  sources: {
    calendar: Provenance[];
    fertilizer: Provenance[];
    irrigation: Provenance[];
  };
}

export type PlanEventDraft = Omit<PlanEvent, 'id' | 'cropCycleId'>;

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Walks the post-transplant stage_durations_days sequentially from the transplant date.
 * 'basal' fertilizer splits apply AT transplanting — it isn't one of the durationed stages
 * itself. Exported so planning.tools.ts can map a weather forecast's dates onto the same
 * stage boundaries (for irrigation) without duplicating this walk or risking it drifting
 * from what buildPlan() itself uses.
 */
export function computeStageDates(transplantWindowStart: string, stageDurationsDays: Record<Stage, number>): Record<string, string> {
  const stageDates: Record<string, string> = { basal: transplantWindowStart };
  let cursor = transplantWindowStart;
  for (const stage of POST_TRANSPLANT_STAGES) {
    stageDates[stage] = cursor;
    cursor = addDays(cursor, stageDurationsDays[stage]);
  }
  return stageDates;
}

const PENDING: PlanEventStatus = 'pending';

function draft(partial: Omit<PlanEventDraft, 'status' | 'actualDate' | 'shiftReason' | 'sortOrder'> & { sortOrder: number }): PlanEventDraft {
  return { ...partial, status: PENDING, actualDate: null, shiftReason: null };
}

export function buildPlan(input: PlanInput): PlanEventDraft[] {
  const events: PlanEventDraft[] = [];
  let order = 0;

  events.push(
    draft({
      stageKey: 'land_prep',
      title: 'Land preparation',
      action: 'Plough and level the field ahead of nursery sowing.',
      quantity: null,
      unit: null,
      plannedDate: addDays(input.sowingDate, -LAND_PREP_LEAD_DAYS),
      sources: input.sources.calendar,
      sortOrder: order++,
    }),
    draft({
      stageKey: 'nursery',
      title: 'Nursery sowing',
      action: 'Sow seed in the nursery bed.',
      quantity: null,
      unit: null,
      plannedDate: input.sowingDate,
      sources: input.sources.calendar,
      sortOrder: order++,
    }),
    draft({
      stageKey: 'transplanting',
      title: 'Transplanting',
      action: 'Transplant seedlings into the main field.',
      quantity: null,
      unit: null,
      plannedDate: input.transplantWindowStart,
      sources: input.sources.calendar,
      sortOrder: order++,
    }),
    draft({
      stageKey: 'harvest',
      title: 'Harvest',
      action: null,
      quantity: null,
      unit: null,
      plannedDate: input.harvestWindowStart,
      sources: input.sources.calendar,
      sortOrder: order++,
    }),
  );

  const stageDates = computeStageDates(input.transplantWindowStart, input.stageDurationsDays);

  for (const [nutrient, data] of Object.entries(input.fertilizer)) {
    for (const split of data.splits) {
      const date = stageDates[split.stage];
      if (!date) continue; // unknown stage name in the data — skip rather than guess a date
      const totalKg = Number((data.dose * split.fraction * input.areaHa).toFixed(2));
      const label = split.stage.replace(/_/g, ' ');
      events.push(
        draft({
          stageKey: split.stage,
          title: `Apply ${nutrient} (${label})`,
          action: `${(split.fraction * 100).toFixed(0)}% of the season's ${nutrient} dose`,
          quantity: totalKg,
          unit: 'kg',
          plannedDate: date,
          sources: input.sources.fertilizer,
          sortOrder: order++,
        }),
      );
    }
  }

  if (input.irrigationByStage) {
    for (const stage of POST_TRANSPLANT_STAGES) {
      const mm = input.irrigationByStage[stage];
      if (mm == null || mm < IRRIGATION_EVENT_THRESHOLD_MM) continue;
      events.push(
        draft({
          stageKey: stage,
          title: 'Irrigation checkpoint',
          action: `Supplemental irrigation likely needed during ${stage.replace(/_/g, ' ')}.`,
          quantity: Number(mm.toFixed(1)),
          unit: 'mm',
          plannedDate: stageDates[stage] ?? null,
          sources: input.sources.irrigation,
          sortOrder: order++,
        }),
      );
    }
  }

  // General practice, not a specific pest/disease call — assess_pest_risk (Phase 8, real
  // pest_rules.json + citations) is where a grounded pest claim belongs, not here.
  events.push(
    draft({
      stageKey: 'tillering',
      title: 'Field scouting checkpoint',
      action: 'General practice: scout for weeds and early pest/disease signs during active tillering.',
      quantity: null,
      unit: null,
      plannedDate: stageDates.tillering ?? null,
      sources: [],
      sortOrder: order++,
    }),
  );

  return events
    .sort((a, b) => (a.plannedDate ?? '').localeCompare(b.plannedDate ?? ''))
    .map((e, i) => ({ ...e, sortOrder: i }));
}
