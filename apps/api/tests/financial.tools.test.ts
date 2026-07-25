// financial.tools.test.ts — compute_financials. Models are mocked; data/crop_rules.json and
// data/costs_bd.json are read for REAL, so this proves the actual repo data works end-to-end.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ToolCtx } from '../src/services/tools/registry';

const getState = vi.fn();
const replaceProjection = vi.fn(async () => undefined);
const listByCycle = vi.fn();

vi.mock('../src/models/field.model', () => ({ FieldModel: { getState } }));
vi.mock('../src/models/ledger.model', () => ({ LedgerModel: { replaceProjection } }));
vi.mock('../src/models/supplierSelection.model', () => ({ SupplierSelectionModel: { listByCycle } }));
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

beforeEach(() => {
  listByCycle.mockResolvedValue([]); // default: no supplier selections
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

describe('compute_financials — supplier_selections override', () => {
  it('uses the selected supplier\'s price for a fertilizer carrier instead of costs_bd.json\'s default', async () => {
    const identity = identityFor('aman_rice');
    getState.mockResolvedValue({ identity, activeCycle: identity.activeCycle, missingFields: [] });
    listByCycle.mockResolvedValue([
      {
        id: 'sel-1', crop_cycle_id: 'cycle-1', item_key: 'urea', supplier_id: 'sup_dhaka_agrimart',
        supplier_name: 'Dhaka Agri Mart', unit_price_bdt: 29, delivery_days: 1, selected_at: '2026-07-25T00:00:00Z',
      },
    ]);

    const out = await call({});
    const ureaLine = out.data.lineItems.find((l: { item: string }) => l.item.startsWith('urea'));
    expect(ureaLine).toBeDefined();
    expect(ureaLine.unitCost).toBe(29); // the supplier's price, not costs_bd.json's 27
    expect(ureaLine.source).toContain('Dhaka Agri Mart');
  });

  it('uses the selected supplier\'s price for seed instead of costs_bd.json\'s default', async () => {
    const identity = identityFor('aman_rice');
    getState.mockResolvedValue({ identity, activeCycle: identity.activeCycle, missingFields: [] });
    listByCycle.mockResolvedValue([
      {
        id: 'sel-2', crop_cycle_id: 'cycle-1', item_key: 'seed', supplier_id: 'sup_jashore_seedhouse',
        supplier_name: 'Jashore Seed House', unit_price_bdt: 58, delivery_days: 3, selected_at: '2026-07-25T00:00:00Z',
      },
    ]);

    const out = await call({});
    const seedLine = out.data.lineItems.find((l: { item: string }) => l.item === 'seed');
    expect(seedLine).toBeDefined();
    expect(seedLine.unitCost).toBe(58); // the supplier's price, not costs_bd.json's 60
    expect(seedLine.source).toContain('Jashore Seed House');
  });

  it('falls back to costs_bd.json when no selection exists for an item', async () => {
    const identity = identityFor('aman_rice');
    getState.mockResolvedValue({ identity, activeCycle: identity.activeCycle, missingFields: [] });
    listByCycle.mockResolvedValue([]);

    const out = await call({});
    const ureaLine = out.data.lineItems.find((l: { item: string }) => l.item.startsWith('urea'));
    expect(ureaLine.unitCost).toBe(27); // costs_bd.json's default
    expect(ureaLine.source).not.toContain('supplier:');
  });

  it('a supplier override survives a second compute_financials call — the exact bug this design avoids', async () => {
    const identity = identityFor('aman_rice');
    getState.mockResolvedValue({ identity, activeCycle: identity.activeCycle, missingFields: [] });
    listByCycle.mockResolvedValue([
      {
        id: 'sel-1', crop_cycle_id: 'cycle-1', item_key: 'urea', supplier_id: 'sup_dhaka_agrimart',
        supplier_name: 'Dhaka Agri Mart', unit_price_bdt: 29, delivery_days: 1, selected_at: '2026-07-25T00:00:00Z',
      },
    ]);

    await call({}); // first rebuild (e.g. the original plan generation)
    const out = await call({}); // second rebuild (e.g. a later replan) — listByCycle is consulted again each time

    const ureaLine = out.data.lineItems.find((l: { item: string }) => l.item.startsWith('urea'));
    expect(ureaLine.unitCost).toBe(29); // still the supplier's price, not reset to 27
  });
});
