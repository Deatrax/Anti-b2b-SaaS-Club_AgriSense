// engines/planner.engine.ts — PURE. Calendar = lookup (crop_rules windows/durations) + date math.
// Generalized (2026-07-25) to cover both transplant crops (rice: nursery -> transplant, stage
// walk anchored on the transplant date) and direct-seeded crops (potato/maize: no nursery, the
// stage walk anchors directly on the sowing/planting date). The caller (planning.tools.ts)
// derives `postAnchorStages` from crop_rules.json's own stage_durations_days keys, so this file
// carries no crop-specific stage vocabulary at all.
import type { PlanEvent, PlanEventStatus, Provenance } from '@agrisense/shared';

export type GrowthModel = 'transplant' | 'direct_seed';
/** Free-form stage name, defined per-crop in crop_rules.json (e.g. rice: 'tillering',
 * potato: 'tuber_bulking'). No longer a fixed union — see the 2026-07-25 generalization note above. */
export type Stage = string;

/** Documented assumption: land prep starts a week before sowing/planting. Not sourced — no
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
  growthModel: GrowthModel;
  /** ISO YYYY-MM-DD. Transplant crops: nursery sowing date. Direct-seed crops: the planting
   * date itself — same value as `anchorDate` for this growth model. */
  sowingDate: string;
  /** Ordered stage keys AFTER the anchor point (transplant date, or sowing date for
   * direct-seed crops) — derived by the caller from crop_rules.json's stage_durations_days,
   * excluding any pre-anchor stages (e.g. rice's 'nursery'). */
  postAnchorStages: string[];
  stageDurationsDays: Record<string, number>;
  /** ISO YYYY-MM-DD. Transplant crops: crop_rules.json's calendar.transplant_window.start.
   * Direct-seed crops: equal to sowingDate — planting IS the anchor. */
  anchorDate: string;
  /** From crop_rules.json's calendar.harvest_window. */
  harvestWindowStart: string;
  /** Keyed by nutrient symbol (N/P/K/S) as crop_rules.json uses. */
  fertilizer: Record<string, FertilizerNutrient>;
  /** Net irrigation mm per stage, pre-aggregated by the tool layer from irrigation.engine's
   * daily output — this engine does no aggregation, only placement on the calendar. */
  irrigationByStage?: Partial<Record<string, number>>;
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
 * Walks `postAnchorStages` sequentially from `anchorDate`. 'basal' fertilizer splits apply AT
 * the anchor date — it isn't one of the durationed stages itself. Exported so planning.tools.ts
 * can map a weather forecast's dates onto the same stage boundaries (for irrigation) without
 * duplicating this walk or risking it drifting from what buildPlan() itself uses.
 */
export function computeStageDates(anchorDate: string, postAnchorStages: string[], stageDurationsDays: Record<string, number>): Record<string, string> {
  const stageDates: Record<string, string> = { basal: anchorDate };
  let cursor = anchorDate;
  for (const stage of postAnchorStages) {
    stageDates[stage] = cursor;
    cursor = addDays(cursor, stageDurationsDays[stage]!);
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
      action: input.growthModel === 'transplant' ? 'Plough and level the field ahead of nursery sowing.' : 'Plough and level the field ahead of planting.',
      quantity: null,
      unit: null,
      plannedDate: addDays(input.sowingDate, -LAND_PREP_LEAD_DAYS),
      sources: input.sources.calendar,
      sortOrder: order++,
    }),
  );

  if (input.growthModel === 'transplant') {
    events.push(
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
        plannedDate: input.anchorDate,
        sources: input.sources.calendar,
        sortOrder: order++,
      }),
    );
  } else {
    events.push(
      draft({
        stageKey: 'sowing',
        title: 'Sowing / planting',
        action: 'Direct-seed or plant into the main field.',
        quantity: null,
        unit: null,
        plannedDate: input.anchorDate,
        sources: input.sources.calendar,
        sortOrder: order++,
      }),
    );
  }

  events.push(
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

  const stageDates = computeStageDates(input.anchorDate, input.postAnchorStages, input.stageDurationsDays);

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
    for (const stage of input.postAnchorStages) {
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

  // General practice, not a specific pest/disease call — assess_pest_risk (real pest_rules.json
  // + citations) is where a grounded pest claim belongs, not here. Scouting is placed at the
  // FIRST post-anchor stage (rice: 'tillering', same as before this file was generalized;
  // potato/maize: their first growth stage after planting) rather than a hardcoded stage name.
  const scoutingStage = input.postAnchorStages[0];
  if (scoutingStage) {
    events.push(
      draft({
        stageKey: scoutingStage,
        title: 'Field scouting checkpoint',
        action: `General practice: scout for weeds and early pest/disease signs during ${scoutingStage.replace(/_/g, ' ')}.`,
        quantity: null,
        unit: null,
        plannedDate: stageDates[scoutingStage] ?? null,
        sources: [],
        sortOrder: order++,
      }),
    );
  }

  return events
    .sort((a, b) => (a.plannedDate ?? '').localeCompare(b.plannedDate ?? ''))
    .map((e, i) => ({ ...e, sortOrder: i }));
}
