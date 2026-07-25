// planner.engine tests (§C.9): calendar = crop_rules windows/durations + date math. Real
// aman_rice values from data/crop_rules.json, so a broken date-walk would fail here first.
import { describe, it, expect } from 'vitest';
import { buildPlan, type PlanInput } from '../src/services/engines/planner.engine';

const calendarSource = [{ source: 'BAMIS / BRRI', method: 'table' as const, retrievedAt: 'now' }];
const fertilizerSource = [{ source: 'BARC FRG-2018', method: 'table' as const, retrievedAt: 'now' }];
const irrigationSource = [{ source: 'Open-Meteo (ECMWF)', method: 'api' as const, retrievedAt: 'now' }];

const RICE_POST_ANCHOR_STAGES = ['tillering', 'panicle_initiation', 'booting', 'flowering', 'grain_filling', 'maturity'];

function baseInput(overrides: Partial<PlanInput> = {}): PlanInput {
  return {
    areaHa: 0.4,
    growthModel: 'transplant',
    sowingDate: '2026-07-01',
    postAnchorStages: RICE_POST_ANCHOR_STAGES,
    stageDurationsDays: {
      nursery: 25,
      tillering: 35,
      panicle_initiation: 20,
      booting: 15,
      flowering: 10,
      grain_filling: 25,
      maturity: 15,
    },
    anchorDate: '2026-08-01',
    harvestWindowStart: '2026-11-30',
    fertilizer: {
      N: {
        dose: 78,
        splits: [
          { stage: 'basal', fraction: 0.33 },
          { stage: 'tillering', fraction: 0.33 },
          { stage: 'panicle_initiation', fraction: 0.34 },
        ],
      },
      P: { dose: 15, splits: [{ stage: 'basal', fraction: 1.0 }] },
      K: { dose: 40, splits: [{ stage: 'basal', fraction: 0.5 }, { stage: 'panicle_initiation', fraction: 0.5 }] },
      S: { dose: 8, splits: [{ stage: 'basal', fraction: 1.0 }] },
    },
    sources: { calendar: calendarSource, fertilizer: fertilizerSource, irrigation: irrigationSource },
    ...overrides,
  };
}

describe('buildPlan — transplant crops (§C.9 calendar)', () => {
  it('dates land prep, nursery, transplanting, and harvest from real crop_rules values', () => {
    const events = buildPlan(baseInput());
    expect(events.find((e) => e.stageKey === 'land_prep')?.plannedDate).toBe('2026-06-24'); // sowing - 7d
    expect(events.find((e) => e.stageKey === 'nursery')?.plannedDate).toBe('2026-07-01');
    expect(events.find((e) => e.stageKey === 'transplanting')?.plannedDate).toBe('2026-08-01');
    expect(events.find((e) => e.stageKey === 'harvest')?.plannedDate).toBe('2026-11-30');
  });

  it('walks post-transplant stages sequentially by their real durations', () => {
    const events = buildPlan(baseInput());
    // tillering starts AT transplant; panicle_initiation starts 35 days later.
    const nFertilizerEvents = events.filter((e) => e.title.startsWith('Apply N'));
    const tilleringSplit = nFertilizerEvents.find((e) => e.stageKey === 'tillering');
    const piSplit = nFertilizerEvents.find((e) => e.stageKey === 'panicle_initiation');
    expect(tilleringSplit?.plannedDate).toBe('2026-08-01');
    expect(piSplit?.plannedDate).toBe('2026-09-05'); // 2026-08-01 + 35 days
  });

  it('prices each fertilizer split as dose × fraction × areaHa', () => {
    const events = buildPlan(baseInput());
    const nBasal = events.find((e) => e.title === 'Apply N (basal)');
    expect(nBasal?.quantity).toBeCloseTo(78 * 0.33 * 0.4, 2); // 10.30
    expect(nBasal?.unit).toBe('kg');
    const pBasal = events.find((e) => e.title === 'Apply P (basal)');
    expect(pBasal?.quantity).toBeCloseTo(15 * 1.0 * 0.4, 2); // 6.0
  });

  it('doubling area doubles every fertilizer quantity (Tier-0 #5 consistency)', () => {
    const base = buildPlan(baseInput()).find((e) => e.title === 'Apply P (basal)')!.quantity!;
    const doubled = buildPlan(baseInput({ areaHa: 0.8 })).find((e) => e.title === 'Apply P (basal)')!.quantity!;
    expect(doubled).toBeCloseTo(base * 2, 5);
  });

  it('skips a fertilizer split whose stage name is not in the data rather than guessing a date', () => {
    const events = buildPlan(
      baseInput({ fertilizer: { X: { dose: 10, splits: [{ stage: 'nonexistent_stage', fraction: 1 }] } } }),
    );
    expect(events.some((e) => e.title.startsWith('Apply X'))).toBe(false);
  });

  it('includes an irrigation checkpoint only when the stage total is at/above the threshold', () => {
    const events = buildPlan(
      baseInput({ irrigationByStage: { tillering: 12.5, panicle_initiation: 3, booting: 5 } }),
    );
    const irrigationEvents = events.filter((e) => e.title === 'Irrigation checkpoint');
    expect(irrigationEvents.map((e) => e.stageKey).sort()).toEqual(['booting', 'tillering']);
  });

  it('omits irrigation checkpoints entirely when no irrigation data is given', () => {
    const events = buildPlan(baseInput());
    expect(events.some((e) => e.title === 'Irrigation checkpoint')).toBe(false);
  });

  it('includes exactly one field scouting checkpoint, at the first post-anchor stage, with no fabricated source', () => {
    const events = buildPlan(baseInput());
    const scouting = events.filter((e) => e.title === 'Field scouting checkpoint');
    expect(scouting).toHaveLength(1);
    expect(scouting[0]!.stageKey).toBe('tillering');
    expect(scouting[0]!.sources).toEqual([]);
  });

  it('every calendar and fertilizer event carries the real provenance it was given', () => {
    const events = buildPlan(baseInput());
    expect(events.find((e) => e.stageKey === 'harvest')?.sources).toBe(calendarSource);
    expect(events.find((e) => e.title === 'Apply P (basal)')?.sources).toBe(fertilizerSource);
  });

  it('returns events sorted chronologically with contiguous sortOrder', () => {
    const events = buildPlan(baseInput());
    for (let i = 1; i < events.length; i++) {
      expect(events[i]!.plannedDate! >= events[i - 1]!.plannedDate!).toBe(true);
    }
    expect(events.map((e) => e.sortOrder)).toEqual(events.map((_, i) => i));
  });
});

function directSeedInput(overrides: Partial<PlanInput> = {}): PlanInput {
  return {
    areaHa: 0.5,
    growthModel: 'direct_seed',
    sowingDate: '2026-11-01',
    postAnchorStages: ['emergence', 'vegetative', 'tuber_bulking', 'maturation'],
    stageDurationsDays: { emergence: 14, vegetative: 23, tuber_bulking: 41, maturation: 14 },
    anchorDate: '2026-11-01',
    harvestWindowStart: '2027-02-01',
    fertilizer: {
      N: { dose: 135, splits: [{ stage: 'basal', fraction: 0.5 }, { stage: 'vegetative', fraction: 0.5 }] },
      P: { dose: 30, splits: [{ stage: 'basal', fraction: 1.0 }] },
    },
    sources: { calendar: calendarSource, fertilizer: fertilizerSource, irrigation: irrigationSource },
    ...overrides,
  };
}

describe('buildPlan — direct-seeded crops (§3 generalization)', () => {
  it('emits sowing directly at the anchor date, with no nursery/transplanting events', () => {
    const events = buildPlan(directSeedInput());
    expect(events.find((e) => e.stageKey === 'sowing')?.plannedDate).toBe('2026-11-01');
    expect(events.some((e) => e.stageKey === 'nursery')).toBe(false);
    expect(events.some((e) => e.stageKey === 'transplanting')).toBe(false);
  });

  it('still dates land prep a week before sowing, and harvest at the harvest window start', () => {
    const events = buildPlan(directSeedInput());
    expect(events.find((e) => e.stageKey === 'land_prep')?.plannedDate).toBe('2026-10-25');
    expect(events.find((e) => e.stageKey === 'harvest')?.plannedDate).toBe('2027-02-01');
  });

  it('walks post-anchor stages sequentially from the sowing date', () => {
    const events = buildPlan(directSeedInput());
    const basalSplit = events.find((e) => e.title === 'Apply N (basal)');
    const vegetativeSplit = events.find((e) => e.title === 'Apply N (vegetative)');
    expect(basalSplit?.plannedDate).toBe('2026-11-01');
    expect(vegetativeSplit?.plannedDate).toBe('2026-11-15'); // 2026-11-01 + emergence(14)
  });

  it('places the field scouting checkpoint at the first post-anchor stage', () => {
    const events = buildPlan(directSeedInput());
    const scouting = events.find((e) => e.title === 'Field scouting checkpoint');
    expect(scouting?.stageKey).toBe('emergence');
    expect(scouting?.plannedDate).toBe('2026-11-01');
  });
});
