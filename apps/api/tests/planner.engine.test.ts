// planner.engine tests (§C.9): calendar = crop_rules windows/durations + date math. Real
// aman_rice values from data/crop_rules.json, so a broken date-walk would fail here first.
import { describe, it, expect } from 'vitest';
import { buildPlan, type PlanInput } from '../src/services/engines/planner.engine';

const calendarSource = [{ source: 'BAMIS / BRRI', method: 'table' as const, retrievedAt: 'now' }];
const fertilizerSource = [{ source: 'BARC FRG-2018', method: 'table' as const, retrievedAt: 'now' }];
const irrigationSource = [{ source: 'Open-Meteo (ECMWF)', method: 'api' as const, retrievedAt: 'now' }];

function baseInput(overrides: Partial<PlanInput> = {}): PlanInput {
  return {
    areaHa: 0.4,
    sowingDate: '2026-07-01',
    stageDurationsDays: {
      nursery: 25,
      tillering: 35,
      panicle_initiation: 20,
      booting: 15,
      flowering: 10,
      grain_filling: 25,
      maturity: 15,
    },
    transplantWindowStart: '2026-08-01',
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

describe('buildPlan (§C.9 calendar)', () => {
  it('dates land prep, nursery, transplanting, and harvest from real crop_rules values', () => {
    const events = buildPlan(baseInput());
    expect(events.find((e) => e.stageKey === 'land_prep')?.plannedDate).toBe('2026-06-24'); // sowing - 7d
    expect(events.find((e) => e.stageKey === 'nursery')?.plannedDate).toBe('2026-07-01');
    expect(events.find((e) => e.stageKey === 'transplanting')?.plannedDate).toBe('2026-08-01');
    expect(events.find((e) => e.stageKey === 'harvest')?.plannedDate).toBe('2026-11-30');
  });

  it('places post-transplant top-dress splits MID-stage, not on the transplant day (BUG-6)', () => {
    const events = buildPlan(baseInput());
    const nFertilizerEvents = events.filter((e) => e.title.startsWith('Apply N'));
    const basalSplit = nFertilizerEvents.find((e) => e.stageKey === 'basal');
    const tilleringSplit = nFertilizerEvents.find((e) => e.stageKey === 'tillering');
    const piSplit = nFertilizerEvents.find((e) => e.stageKey === 'panicle_initiation');
    // basal AT transplant; tillering mid-stage (2026-08-01 + floor(35/2)=17 days);
    // PI mid-stage (stage starts 2026-09-05, +floor(20/2)=10 days).
    expect(basalSplit?.plannedDate).toBe('2026-08-01');
    expect(tilleringSplit?.plannedDate).toBe('2026-08-18');
    expect(piSplit?.plannedDate).toBe('2026-09-15');
    // The regression itself: the tillering split must NOT land on the transplant/basal day.
    expect(tilleringSplit?.plannedDate).not.toBe(basalSplit?.plannedDate);
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

  it('includes exactly one field scouting checkpoint with no fabricated source', () => {
    const events = buildPlan(baseInput());
    const scouting = events.filter((e) => e.title === 'Field scouting checkpoint');
    expect(scouting).toHaveLength(1);
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
