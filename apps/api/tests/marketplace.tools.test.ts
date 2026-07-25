// apps/api/tests/marketplace.tools.test.ts — Models are mocked; data/suppliers.json and
// data/districts.json are read for REAL (same convention as financial.tools.test.ts), so
// this proves the actual seeded catalog matches end-to-end.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ToolCtx } from '../src/services/tools/registry';

const getState = vi.fn();
const listByCycle = vi.fn();
const upsert = vi.fn();
const selectionListByCycle = vi.fn();

vi.mock('../src/models/field.model', () => ({ FieldModel: { getState } }));
vi.mock('../src/models/ledger.model', () => ({ LedgerModel: { listByCycle } }));
vi.mock('../src/models/supplierSelection.model', () => ({
  SupplierSelectionModel: { upsert, listByCycle: selectionListByCycle },
}));
vi.mock('../src/models/trace.model', () => ({
  TraceModel: {
    begin: vi.fn(async (_c: string, _m: string | null, step: number) => ({ id: `t${step}`, step, startedAt: Date.now() })),
    ok: vi.fn(async () => undefined),
    error: vi.fn(async () => undefined),
    fallback: vi.fn(async () => undefined),
  },
}));

const {
  registerMarketplaceTools,
  matchSuppliersForField,
  selectSupplierForField,
} = await import('../src/services/tools/marketplace.tools');
const { getRegistry } = await import('../src/services/tools/registry');

registerMarketplaceTools();

// Dhaka's real districts.json centroid — field sits right in the catalog's densest area.
const DHAKA_FIELD_STATE = {
  identity: { id: 'field-1', farmId: 'farm-1', lat: 23.8103, lon: 90.4125, areaHa: 0.5 },
  activeCycle: { id: 'cycle-1', crop: 'aman_rice', season: 'aman', status: 'active' },
  missingFields: [],
};

function ureaLedgerLine(qty = 50) {
  return {
    id: 'l1', cropCycleId: 'cycle-1', kind: 'cost', item: 'urea (for N)', qty, unit: 'kg',
    unitCost: 27, total: qty * 27, source: 'costs_bd.json', assumption: null, isActual: false,
    occurredOn: null, transactionId: null,
  };
}

function seedLedgerLine(qty = 20) {
  return {
    id: 'l2', cropCycleId: 'cycle-1', kind: 'cost', item: 'seed', qty, unit: 'kg',
    unitCost: 60, total: qty * 60, source: 'costs_bd.json (seed)', assumption: null, isActual: false,
    occurredOn: null, transactionId: null,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  selectionListByCycle.mockResolvedValue([]); // default: no confirmed supplier selections
});

describe('matchSuppliersForField — real data/suppliers.json + data/districts.json', () => {
  it('returns ranked offers for a needed fertilizer carrier, with every offer\'s subScores/weights', async () => {
    getState.mockResolvedValue(DHAKA_FIELD_STATE);
    listByCycle.mockResolvedValue([ureaLedgerLine(50)]);

    const result = await matchSuppliersForField('field-1');

    expect(result.items).toHaveLength(1);
    const item = result.items[0]!;
    expect(item.itemKey).toBe('urea');
    expect(item.neededQty).toBe(50);
    expect(item.offers.length).toBeGreaterThanOrEqual(2); // urea is stocked by many seeded suppliers
    expect(item.offers[0]).toHaveProperty('subScores');
    // ranked descending
    for (let i = 1; i < item.offers.length; i++) {
      expect(item.offers[i - 1]!.score).toBeGreaterThanOrEqual(item.offers[i]!.score);
    }
  });

  it('has a null selectedSupplierId when no supplier has been chosen for this item yet', async () => {
    getState.mockResolvedValue(DHAKA_FIELD_STATE);
    listByCycle.mockResolvedValue([ureaLedgerLine(50)]);
    selectionListByCycle.mockResolvedValue([]);

    const result = await matchSuppliersForField('field-1');
    expect(result.items[0]!.selectedSupplierId).toBeNull();
  });

  it('surfaces the already-confirmed supplier as selectedSupplierId (survives a page reload)', async () => {
    getState.mockResolvedValue(DHAKA_FIELD_STATE);
    listByCycle.mockResolvedValue([ureaLedgerLine(50)]);
    selectionListByCycle.mockResolvedValue([
      {
        id: 'sel-1', crop_cycle_id: 'cycle-1', item_key: 'urea', supplier_id: 'sup_dhaka_agrimart',
        supplier_name: 'Dhaka Agri Mart', unit_price_bdt: 29, delivery_days: 1, selected_at: '2026-07-25T00:00:00Z',
      },
    ]);

    const result = await matchSuppliersForField('field-1');
    expect(result.items[0]!.selectedSupplierId).toBe('sup_dhaka_agrimart');
  });

  it('derives the seed catalog key from the active cycle\'s crop', async () => {
    getState.mockResolvedValue(DHAKA_FIELD_STATE); // crop: aman_rice
    listByCycle.mockResolvedValue([seedLedgerLine(20)]);

    const result = await matchSuppliersForField('field-1');

    expect(result.items).toHaveLength(1);
    expect(result.items[0]!.itemKey).toBe('seed');
    // seed_aman_rice is stocked by sup_jashore_seedhouse et al. in the seeded catalog
    expect(result.items[0]!.offers.length).toBeGreaterThan(0);
  });

  it('excludes out-of-stock offers entirely (e.g. Khulna Agro Line\'s MoP)', async () => {
    getState.mockResolvedValue(DHAKA_FIELD_STATE);
    listByCycle.mockResolvedValue([
      { ...ureaLedgerLine(1), id: 'l3', item: 'mop (for K)' },
    ]);

    const result = await matchSuppliersForField('field-1');
    const mopOffers = result.items[0]!.offers;
    expect(mopOffers.find((o) => o.supplierId === 'sup_khulna_agroline')).toBeUndefined();
  });

  it('returns no items when there is nothing left to buy (no matching ledger cost rows)', async () => {
    getState.mockResolvedValue(DHAKA_FIELD_STATE);
    listByCycle.mockResolvedValue([]);

    const result = await matchSuppliersForField('field-1');
    expect(result.items).toEqual([]);
  });

  it('returns no items when there is no active crop cycle', async () => {
    getState.mockResolvedValue({ identity: DHAKA_FIELD_STATE.identity, activeCycle: null, missingFields: ['target_season'] });
    listByCycle.mockResolvedValue([ureaLedgerLine()]);

    const result = await matchSuppliersForField('field-1');
    expect(result.items).toEqual([]);
  });

  it('throws when the field has no lat/lon set', async () => {
    getState.mockResolvedValue({ ...DHAKA_FIELD_STATE, identity: { ...DHAKA_FIELD_STATE.identity, lat: null, lon: null } });
    listByCycle.mockResolvedValue([ureaLedgerLine()]);

    await expect(matchSuppliersForField('field-1')).rejects.toThrow(/no location set/);
  });

  it('an itemKey filter narrows to just that item', async () => {
    getState.mockResolvedValue(DHAKA_FIELD_STATE);
    listByCycle.mockResolvedValue([ureaLedgerLine(50), seedLedgerLine(20)]);

    const result = await matchSuppliersForField('field-1', 'seed');
    expect(result.items).toHaveLength(1);
    expect(result.items[0]!.itemKey).toBe('seed');
  });
});

describe('match_suppliers tool registration', () => {
  function makeCtx(): ToolCtx {
    return {
      conversationId: 'conv-1', messageId: null, fieldId: 'field-1',
      stream: { text: vi.fn(), toolStart: vi.fn(), toolEnd: vi.fn(), notice: vi.fn(), done: vi.fn() },
    };
  }

  it('is registered as a deterministic-class tool available in PLANNING/MAINTAINING', () => {
    const def = getRegistry().get('match_suppliers')!;
    expect(def.toolClass).toBe('deterministic');
    expect(def.phases).toEqual(expect.arrayContaining(['PLANNING', 'MAINTAINING']));
  });

  it('returns provenance citing data/suppliers.json, data/districts.json, and the engine', async () => {
    getState.mockResolvedValue(DHAKA_FIELD_STATE);
    listByCycle.mockResolvedValue([ureaLedgerLine(50)]);

    const out = await getRegistry().get('match_suppliers')!.handler({}, makeCtx());
    const sources = (out.provenance as { source: string }[]).map((p) => p.source);
    expect(sources).toEqual(expect.arrayContaining(['data/suppliers.json', 'data/districts.json']));
  });
});

describe('selectSupplierForField', () => {
  it('resolves the catalog offer and upserts a supplier_selections row', async () => {
    getState.mockResolvedValue(DHAKA_FIELD_STATE);
    upsert.mockResolvedValue({
      id: 'sel-1', crop_cycle_id: 'cycle-1', item_key: 'urea', supplier_id: 'sup_dhaka_agrimart',
      supplier_name: 'Dhaka Agri Mart', unit_price_bdt: 29, delivery_days: 1, selected_at: '2026-07-25T00:00:00Z',
    });

    const { selection } = await selectSupplierForField('field-1', 'urea', 'sup_dhaka_agrimart');

    expect(selection.supplier_name).toBe('Dhaka Agri Mart');
    expect(upsert).toHaveBeenCalledWith('cycle-1', 'urea', {
      supplierId: 'sup_dhaka_agrimart', supplierName: 'Dhaka Agri Mart', unitPriceBdt: 29, deliveryDays: 1,
    });
  });

  it('rejects an unknown supplier id', async () => {
    getState.mockResolvedValue(DHAKA_FIELD_STATE);
    await expect(selectSupplierForField('field-1', 'urea', 'sup_does_not_exist')).rejects.toThrow(/unknown supplier/);
  });

  it('rejects a supplier that does not stock the requested item', async () => {
    getState.mockResolvedValue(DHAKA_FIELD_STATE); // crop: aman_rice
    // sup_jashore_seedhouse stocks seed but no fertilizer at all
    await expect(selectSupplierForField('field-1', 'urea', 'sup_jashore_seedhouse')).rejects.toThrow(/does not currently stock/);
  });

  it('rejects when there is no active crop cycle', async () => {
    getState.mockResolvedValue({ identity: DHAKA_FIELD_STATE.identity, activeCycle: null, missingFields: [] });
    await expect(selectSupplierForField('field-1', 'urea', 'sup_dhaka_agrimart')).rejects.toThrow(/no active crop cycle/);
  });
});
