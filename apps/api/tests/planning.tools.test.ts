// planning.tools.test.ts — Phase 4: lookup_crop_rules, rank_crops, build_season_plan.
// Models + weather are mocked; data/crop_rules.json, suitability.json, rotation.json,
// costs_bd.json are read for REAL — these tests exercise the actual fit-score math against
// the actual data currently in the repo (today: aman_rice only).
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ToolCtx } from '../src/services/tools/registry';

const getState = vi.fn();
const listByField = vi.fn();
const history = vi.fn();
const cycleCreate = vi.fn(async () => ({ id: 'cycle-1' }));
const replaceForCycle = vi.fn(async () => undefined);
const seasonPlanCreate = vi.fn(async () => ({ id: 'plan-1', cropCycleId: 'cycle-1', revision: 1, weatherSnapshot: {}, generatedAt: 'now' }));
const getForecast = vi.fn();

vi.mock('../src/models/field.model', () => ({ FieldModel: { getState } }));
vi.mock('../src/models/cropCycle.model', () => ({ CropCycleModel: { listByField, history, create: cycleCreate } }));
vi.mock('../src/models/planEvent.model', () => ({ PlanEventModel: { replaceForCycle } }));
vi.mock('../src/models/seasonPlan.model', () => ({ SeasonPlanModel: { create: seasonPlanCreate, getLatestForCycle: vi.fn() } }));
vi.mock('../src/services/external/openmeteo.client', () => ({ getForecast }));
vi.mock('../src/models/trace.model', () => ({
  TraceModel: {
    begin: vi.fn(async (_c: string, _m: string | null, step: number) => ({ id: `t${step}`, step, startedAt: Date.now() })),
    ok: vi.fn(async () => undefined),
    error: vi.fn(async () => undefined),
    fallback: vi.fn(async () => undefined),
  },
}));

const { registerPlanningTools } = await import('../src/services/tools/planning.tools');
const { getRegistry } = await import('../src/services/tools/registry');

registerPlanningTools();

function makeCtx(): ToolCtx {
  return {
    conversationId: `conv-${Math.random()}`,
    messageId: null,
    fieldId: 'field-1',
    stream: { text: vi.fn(), toolStart: vi.fn(), toolEnd: vi.fn(), notice: vi.fn(), done: vi.fn() },
  };
}

const readyIdentity = {
  id: 'field-1', farmId: 'farm-1', name: 'Field', areaHa: 0.4, soilType: 'loam',
  waterSource: 'shallow_tubewell', lat: 24.7471, lon: 90.4203, budgetBdt: 100000,
};

// 16 days covering the Open-Meteo shape the code reads: daily precip/tmax/tmin/et0.
function makeForecast(overrides: Partial<{ precip: number; tmax: number; tmin: number; et0: number; startDate: string }> = {}) {
  const { precip = 10, tmax = 32, tmin = 26, et0 = 4, startDate = '2026-08-01' } = overrides;
  const time = Array.from({ length: 16 }, (_, i) => {
    const d = new Date(`${startDate}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + i);
    return d.toISOString().slice(0, 10);
  });
  return {
    latitude: 24.7471,
    longitude: 90.4203,
    daily: {
      time,
      precipitation_sum: time.map(() => precip),
      temperature_2m_max: time.map(() => tmax),
      temperature_2m_min: time.map(() => tmin),
      et0_fao_evapotranspiration: time.map(() => et0),
      precipitation_probability_max: time.map(() => 80),
    },
    hourly: { time: [], relative_humidity_2m: [], soil_moisture_0_to_7cm: [], soil_temperature_0cm: [] },
    cachedAt: '2026-08-01T09:00:00.000Z',
    stale: false,
  };
}

interface LooseToolResult {
  data: any;
  provenance: { source: string }[];
  assumptions?: string[];
}

async function call(name: string, args: unknown, ctx = makeCtx()): Promise<LooseToolResult> {
  return getRegistry().get(name)!.handler(args, ctx) as Promise<LooseToolResult>;
}

beforeEach(() => {
  vi.clearAllMocks();
  getState.mockResolvedValue({ identity: readyIdentity, activeCycle: null, missingFields: [] });
  listByField.mockResolvedValue([{ id: 'planned-1', field_id: 'field-1', crop: null, variety: null, season: 'aman', sowing_date: null, expected_harvest: null, status: 'planned', stage: null, day_index: null, actual_yield_kg: null }]);
  history.mockResolvedValue([]);
  getForecast.mockResolvedValue(makeForecast());
});

describe('lookup_crop_rules', () => {
  it('returns the real crop_rules.json data for aman_rice with cited provenance', async () => {
    const out = await call('lookup_crop_rules', { crop: 'aman_rice' });
    expect(out.data).toMatchObject({ season: 'aman', label: expect.stringContaining('Aman') });
    expect(out.provenance.map((p: { source: string }) => p.source)).toEqual(
      expect.arrayContaining([expect.stringContaining('BARC'), expect.stringContaining('BAMIS')]),
    );
  });

  it('throws a clear error for a crop not in the data', async () => {
    await expect(call('lookup_crop_rules', { crop: 'dragonfruit' })).rejects.toThrow(/unknown crop/);
  });

  it('flags pending verification since the current data is still marked _verify', async () => {
    const out = await call('lookup_crop_rules', { crop: 'aman_rice' });
    expect(out.assumptions?.[0]).toMatch(/pending verification/);
  });
});

describe('rank_crops', () => {
  it('throws when the field has no target season yet', async () => {
    listByField.mockResolvedValue([]);
    await expect(call('rank_crops', {})).rejects.toThrow(/target season/);
  });

  it('throws when the field has no location yet', async () => {
    getState.mockResolvedValue({ identity: { ...readyIdentity, lat: null, lon: null }, activeCycle: null, missingFields: [] });
    await expect(call('rank_crops', {})).rejects.toThrow(/location/);
  });

  it('scores aman_rice with seasonFit=1 when the target season matches', async () => {
    const out = await call('rank_crops', {});
    const amanRice = out.data.ranked.find((c: { crop: string }) => c.crop === 'aman_rice');
    expect(amanRice).toMatchObject({ seasonFit: 1, label: expect.any(String) });
  });

  it('scores seasonFit=0 when the target season does not match', async () => {
    listByField.mockResolvedValue([{ id: 'p1', field_id: 'field-1', crop: null, variety: null, season: 'boro', sowing_date: null, expected_harvest: null, status: 'planned', stage: null, day_index: null, actual_yield_kg: null }]);
    const out = await call('rank_crops', {});
    const amanRice = out.data.ranked.find((c: { crop: string }) => c.crop === 'aman_rice');
    expect(amanRice.seasonFit).toBe(0);
  });

  it('defaults rotationFit to neutral 0.5 with no crop history', async () => {
    const out = await call('rank_crops', {});
    expect(out.data.ranked[0].rotationFit).toBe(0.5);
  });

  it('applies the real rotation.json modifier when history matches a rule, and flags its _verify status', async () => {
    history.mockResolvedValue([{ id: 'h1', field_id: 'field-1', crop: 'aman_rice', variety: null, season: 'aman', sowing_date: null, expected_harvest: null, status: 'harvested', stage: null, day_index: null, actual_yield_kg: null }]);
    const out = await call('rank_crops', {});
    // aman_rice → aman_rice modifier is -0.05 in data/rotation.json, _verify: true
    expect(out.data.ranked[0].rotationFit).toBeCloseTo(0.45, 5);
    expect(out.assumptions?.some((a: string) => a.includes('rotation adjustment'))).toBe(true);
  });

  it('surfaces the soil/water neutral-default and rainfall-extrapolation assumptions', async () => {
    const out = await call('rank_crops', {});
    expect(out.assumptions?.some((a: string) => a.includes('neutral 0.7 default'))).toBe(true);
    expect(out.assumptions?.some((a: string) => a.includes('extrapolates the current 16-day'))).toBe(true);
  });

  it('applies zero budget penalty when the budget comfortably covers the rough cost estimate', async () => {
    getState.mockResolvedValue({ identity: { ...readyIdentity, budgetBdt: 10_000_000 }, activeCycle: null, missingFields: [] });
    const out = await call('rank_crops', {});
    expect(out.data.ranked[0].budgetPenalty).toBe(0);
  });

  it('applies a positive budget penalty when the budget is far below the rough cost estimate', async () => {
    getState.mockResolvedValue({ identity: { ...readyIdentity, budgetBdt: 100 }, activeCycle: null, missingFields: [] });
    const out = await call('rank_crops', {});
    expect(out.data.ranked[0].budgetPenalty).toBeGreaterThan(0);
  });
});

describe('build_season_plan', () => {
  it('throws for a crop not in crop_rules.json', async () => {
    await expect(call('build_season_plan', { crop: 'dragonfruit' })).rejects.toThrow(/unknown crop/);
  });

  it('throws when the field lacks area or location', async () => {
    getState.mockResolvedValue({ identity: { ...readyIdentity, areaHa: null }, activeCycle: null, missingFields: [] });
    await expect(call('build_season_plan', { crop: 'aman_rice' })).rejects.toThrow(/area\/location/);
  });

  it('activates a crop cycle, replaces the plan events, and persists a season plan with the real weather snapshot', async () => {
    const out = await call('build_season_plan', { crop: 'aman_rice' });

    expect(cycleCreate).toHaveBeenCalledWith('field-1', expect.objectContaining({ season: 'aman', crop: 'aman_rice', status: 'active' }));
    expect(replaceForCycle).toHaveBeenCalledWith('cycle-1', expect.any(Array));
    expect(seasonPlanCreate).toHaveBeenCalledWith('cycle-1', expect.objectContaining({ cachedAt: expect.any(String) }));

    expect(out.data.cropCycleId).toBe('cycle-1');
    expect(out.data.seasonPlanId).toBe('plan-1');
    expect(out.data.events.length).toBeGreaterThan(0);
    expect(out.data.events.every((e: { cropCycleId: string }) => e.cropCycleId === 'cycle-1')).toBe(true);
  });

  it('honors an explicit sowingDate override instead of the crop_rules default', async () => {
    await call('build_season_plan', { crop: 'aman_rice', sowingDate: '2026-07-10' });
    expect(cycleCreate).toHaveBeenCalledWith('field-1', expect.objectContaining({ sowingDate: '2026-07-10' }));
  });

  it('only estimates irrigation for the stage the 16-day forecast window actually covers', async () => {
    // Forecast starting well into the tillering stage (transplant + ~40 days).
    getForecast.mockResolvedValue(makeForecast({ startDate: '2026-09-10', precip: 0, et0: 5 }));
    const out = await call('build_season_plan', { crop: 'aman_rice' });
    const irrigationEvents = out.data.events.filter((e: { title: string }) => e.title === 'Irrigation checkpoint');
    expect(irrigationEvents.length).toBeLessThanOrEqual(1);
  });
});

describe('potato — direct-seeded crop end-to-end (§3 generalization)', () => {
  it('rank_crops includes potato as a candidate with a real tempFit score', async () => {
    listByField.mockResolvedValue([{ id: 'p1', field_id: 'field-1', crop: null, variety: null, season: 'rabi', sowing_date: null, expected_harvest: null, status: 'planned', stage: null, day_index: null, actual_yield_kg: null }]);
    const out = await call('rank_crops', {});
    const potato = out.data.ranked.find((c: { crop: string }) => c.crop === 'potato');
    expect(potato).toBeDefined();
    expect(potato.seasonFit).toBe(1); // target season 'rabi' matches potato's season
    expect(potato.tempFit).toBeGreaterThan(0);
  });

  it('build_season_plan(potato) emits a sowing event with no nursery/transplanting, and does not throw', async () => {
    const out = await call('build_season_plan', { crop: 'potato' });
    expect(out.data.events.some((e: { stageKey: string }) => e.stageKey === 'sowing')).toBe(true);
    expect(out.data.events.some((e: { stageKey: string }) => e.stageKey === 'nursery')).toBe(false);
    expect(out.data.events.some((e: { stageKey: string }) => e.stageKey === 'transplanting')).toBe(false);
    expect(cycleCreate).toHaveBeenCalledWith('field-1', expect.objectContaining({ crop: 'potato', status: 'active' }));
  });

  it('build_season_plan(potato) prices the N/K vegetative-stage split correctly', async () => {
    const out = await call('build_season_plan', { crop: 'potato' });
    const events = out.data.events as { title: string; quantity: number | null }[];
    const nVegetative = events.find((e) => e.title === 'Apply N (vegetative)');
    expect(nVegetative?.quantity).toBeCloseTo(135 * 0.5 * readyIdentity.areaHa, 2);
  });
});
