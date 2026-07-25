// field.tools.test.ts — Phase 2: get_field_state, update_field, log_field_event, get_crop_history.
// Models are mocked; this verifies the tool layer's own logic (routing target_season to
// CropCycleModel.create, district resolution, streak computation) — not the DB.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { FieldState } from '@agrisense/shared';
import type { ToolCtx } from '../src/services/tools/registry';

const getState = vi.fn();
const update = vi.fn(async () => undefined);
const cycleCreate = vi.fn(async () => ({ id: 'cycle-new' }));
const cycleHistory = vi.fn();
const logAdd = vi.fn();

vi.mock('../src/models/field.model', () => ({ FieldModel: { getState, update } }));
vi.mock('../src/models/cropCycle.model', () => ({ CropCycleModel: { create: cycleCreate, history: cycleHistory } }));
vi.mock('../src/models/fieldLog.model', () => ({ FieldLogModel: { add: logAdd } }));
vi.mock('../src/models/trace.model', () => ({
  TraceModel: {
    begin: vi.fn(async (_c: string, _m: string | null, step: number) => ({ id: `t${step}`, step, startedAt: Date.now() })),
    ok: vi.fn(async () => undefined),
    error: vi.fn(async () => undefined),
    fallback: vi.fn(async () => undefined),
  },
}));

const { registerFieldTools } = await import('../src/services/tools/field.tools');
const { getRegistry } = await import('../src/services/tools/registry');

registerFieldTools();

function makeCtx(): ToolCtx {
  return {
    conversationId: `conv-${Math.random()}`,
    messageId: null,
    fieldId: 'field-1',
    stream: { text: vi.fn(), toolStart: vi.fn(), toolEnd: vi.fn(), notice: vi.fn(), done: vi.fn() },
  };
}

const emptyState: FieldState = {
  identity: {
    id: 'field-1',
    farmId: 'farm-1',
    name: null,
    areaHa: null,
    soilType: null,
    waterSource: null,
    lat: null,
    lon: null,
    budgetBdt: null,
  },
  activeCycle: null,
  targetSeason: null,
  missingFields: ['location', 'area_ha', 'soil_type', 'water_source', 'budget_bdt', 'target_season'],
};

beforeEach(() => {
  vi.clearAllMocks();
  getState.mockResolvedValue(emptyState);
});

async function call(name: string, args: unknown, ctx = makeCtx()) {
  return getRegistry().get(name)!.handler(args, ctx);
}

describe('get_field_state', () => {
  it('returns FieldModel.getState() verbatim with table provenance', async () => {
    const out = await call('get_field_state', {});
    expect(out.data).toBe(emptyState);
    expect(out.provenance[0]).toMatchObject({ source: 'AgriSense field record', method: 'table' });
  });
});

describe('update_field', () => {
  it('applies a plain patch via FieldModel.update and does not touch crop cycles', async () => {
    await call('update_field', { area_ha: 0.5, soil_type: 'loam' });
    expect(update).toHaveBeenCalledWith('field-1', { area_ha: 0.5, soil_type: 'loam' });
    expect(cycleCreate).not.toHaveBeenCalled();
  });

  it('routes a target_season-only patch to CropCycleModel.create, not FieldModel.update', async () => {
    await call('update_field', { target_season: 'aman' });
    expect(cycleCreate).toHaveBeenCalledWith('field-1', { season: 'aman' });
    expect(update).not.toHaveBeenCalled();
  });

  it('resolves a district name to lat/lon via districts.json', async () => {
    const out = await call('update_field', { district: 'Dhaka' });
    expect(update).toHaveBeenCalledWith('field-1', { lat: 23.8103, lon: 90.4125 });
    expect(out.provenance.some((p) => p.source === 'data/districts.json')).toBe(true);
  });

  it('throws on an unknown district', async () => {
    await expect(call('update_field', { district: 'Atlantis' })).rejects.toThrow(/unknown district/);
  });

  it('prefers explicit lat/lon over district when both are given', async () => {
    await call('update_field', { lat: 1, lon: 2, district: 'Dhaka' });
    expect(update).toHaveBeenCalledWith('field-1', { lat: 1, lon: 2 });
  });

  it('rejects lat without lon', async () => {
    await expect(call('update_field', { lat: 1 })).rejects.toThrow(/together/);
  });
});

describe('log_field_event', () => {
  it('links the log to the active cycle and flags non-observations for replan', async () => {
    getState.mockResolvedValue({ ...emptyState, activeCycle: { ...emptyState.activeCycle, id: 'cycle-1' } as never });
    const out = await call('log_field_event', { kind: 'irrigation', description: 'Ran the pump for 2 hours' });

    expect(logAdd).toHaveBeenCalledWith(
      'field-1',
      'irrigation',
      { description: 'Ran the pump for 2 hours', quantity: undefined, unit: undefined },
      'cycle-1',
    );
    expect(out.data).toMatchObject({ replanRecommended: true });
  });

  it('does not recommend a replan for a plain observation', async () => {
    const out = await call('log_field_event', { kind: 'observation', description: 'Leaves look healthy' });
    expect(out.data).toMatchObject({ replanRecommended: false });
  });
});

describe('get_crop_history', () => {
  it('computes lastCrop/lastSeason/sameCropStreak from the most-recent-first history', async () => {
    cycleHistory.mockResolvedValue([
      { id: '3', crop: 'aman_rice', season: 'aman' },
      { id: '2', crop: 'aman_rice', season: 'aman' },
      { id: '1', crop: 'jute', season: 'rabi' },
    ]);
    const out = await call('get_crop_history', {});
    expect(out.data).toMatchObject({ lastCrop: 'aman_rice', lastSeason: 'aman', sameCropStreak: 2 });
  });

  it('handles an empty history without throwing', async () => {
    cycleHistory.mockResolvedValue([]);
    const out = await call('get_crop_history', {});
    expect(out.data).toMatchObject({ lastCrop: null, lastSeason: null, sameCropStreak: 0 });
  });
});
