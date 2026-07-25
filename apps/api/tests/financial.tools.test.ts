// financial.tools.test.ts — compute_financials. Models are mocked; data/crop_rules.json and
// data/costs_bd.json are read for REAL, so this proves the actual repo data works end-to-end.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ToolCtx } from '../src/services/tools/registry';

const getState = vi.fn();
const replaceProjection = vi.fn(async () => undefined);

vi.mock('../src/models/field.model', () => ({ FieldModel: { getState } }));
vi.mock('../src/models/ledger.model', () => ({ LedgerModel: { replaceProjection } }));
vi.mock('../src/models/trace.model', () => ({
  TraceModel: {
    begin: vi.fn(async (_c: string, _m: string | null, step: number) => ({ id: `t${step}`, step, startedAt: Date.now() })),
    ok: vi.fn(async () => undefined),
    error: vi.fn(async () => undefined),
    fallback: vi.fn(async () => undefined),
  },
}));

const { registerFinancialTools } = await import('../src/services/tools/financial.tools');
const { getRegistry } = await import('../src/services/tools/registry');

registerFinancialTools();

function makeCtx(): ToolCtx {
  return {
    conversationId: `conv-${Math.random()}`,
    messageId: null,
    fieldId: 'field-1',
    stream: { text: vi.fn(), toolStart: vi.fn(), toolEnd: vi.fn(), notice: vi.fn(), done: vi.fn() },
  };
}

function identityFor(crop: string) {
  return {
    id: 'field-1', farmId: 'farm-1', name: 'Field', areaHa: 0.4, soilType: 'loam',
    waterSource: 'shallow_tubewell', lat: 24.7471, lon: 90.4203, budgetBdt: 100000,
    activeCycle: { id: 'cycle-1', crop, season: 'test', status: 'active' },
  };
}

async function call(args: unknown, ctx = makeCtx()) {
  return getRegistry().get('compute_financials')!.handler(args, ctx) as Promise<{
    data: { totalCost: number; expectedYieldKg: number; grossRevenue: number };
  }>;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('compute_financials — real crop_rules.json/costs_bd.json data', () => {
  it('computes real numbers for aman_rice without throwing', async () => {
    const identity = identityFor('aman_rice');
    getState.mockResolvedValue({ identity, activeCycle: identity.activeCycle, missingFields: [] });
    const out = await call({});
    expect(out.data.totalCost).toBeGreaterThan(0);
    expect(out.data.expectedYieldKg).toBeGreaterThan(0);
    expect(out.data.grossRevenue).toBeGreaterThan(0);
  });

  it('computes real numbers for boro_rice without throwing', async () => {
    const identity = identityFor('boro_rice');
    getState.mockResolvedValue({ identity, activeCycle: identity.activeCycle, missingFields: [] });
    const out = await call({});
    expect(out.data.totalCost).toBeGreaterThan(0);
    expect(out.data.expectedYieldKg).toBeGreaterThan(0);
    expect(out.data.grossRevenue).toBeGreaterThan(0);
  });

  it('computes real numbers for aus_rice without throwing', async () => {
    const identity = identityFor('aus_rice');
    getState.mockResolvedValue({ identity, activeCycle: identity.activeCycle, missingFields: [] });
    const out = await call({});
    expect(out.data.totalCost).toBeGreaterThan(0);
    expect(out.data.expectedYieldKg).toBeGreaterThan(0);
    expect(out.data.grossRevenue).toBeGreaterThan(0);
  });
});
