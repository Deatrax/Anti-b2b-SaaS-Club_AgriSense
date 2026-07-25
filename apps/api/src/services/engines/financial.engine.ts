// engines/financial.engine.ts — PURE (§C.9): no I/O, no async, no randomness. Unit-tested.
// tests/financial.engine.test.ts is the file that scores — implemented to satisfy it.
import type { LedgerEntry, FinancialResult } from '@agrisense/shared';

/** One already-priced cost line — the caller (financial.tools.ts) does the qty×unitCost math
 * and cites the source/assumption; this engine only sums and never touches the filesystem. */
export interface CostLineItemInput {
  item: string;
  qty: number | null;
  unit: string | null;
  unitCost: number | null;
  total: number;
  source: string | null;
  assumption: string | null;
}

export interface FinancialInput {
  cropCycleId: string;
  crop: string;
  season: string;
  areaHa: number;
  baseYieldKgPerHa: number;
  farmgatePriceBdtPerKg: number;
  /** Yield multiplier for current weather conditions (1.0 = normal). */
  weatherAdj: number;
  /** Yield multiplier for input quality/access (1.0 = standard). */
  inputAdj: number;
  costLineItems: CostLineItemInput[];
}

function draftEntry(cropCycleId: string, kind: LedgerEntry['kind'], e: CostLineItemInput): LedgerEntry {
  return {
    id: '',
    cropCycleId,
    kind,
    item: e.item,
    qty: e.qty,
    unit: e.unit,
    unitCost: e.unitCost,
    total: e.total,
    source: e.source,
    assumption: e.assumption,
    isActual: false,
    occurredOn: null,
    transactionId: null,
  };
}

// Formulas (§C.9):
//   total_cost     = Σ line_items
//   expected_yield = base_yield(crop, season) × area × weather_adj × input_adj
//   gross_revenue  = expected_yield × farmgate_price
//   net_profit     = gross_revenue − total_cost
//   roi            = net_profit / total_cost
//   bcr            = gross_revenue / total_cost    (Boro HYV sanity anchor ≈ 1.9–2.3)
//   be_yield       = total_cost / farmgate_price
//   be_price       = total_cost / expected_yield
export function computeFinancials(input: FinancialInput): FinancialResult {
  const totalCost = input.costLineItems.reduce((sum, e) => sum + e.total, 0);
  const expectedYieldKg = input.baseYieldKgPerHa * input.areaHa * input.weatherAdj * input.inputAdj;
  const grossRevenue = expectedYieldKg * input.farmgatePriceBdtPerKg;
  const netProfit = grossRevenue - totalCost;

  const roi = totalCost !== 0 ? netProfit / totalCost : 0;
  const bcr = totalCost !== 0 ? grossRevenue / totalCost : 0;
  const breakEvenYieldKg = input.farmgatePriceBdtPerKg !== 0 ? totalCost / input.farmgatePriceBdtPerKg : 0;
  const breakEvenPrice = expectedYieldKg !== 0 ? totalCost / expectedYieldKg : 0;

  const revenueLine = draftEntry(input.cropCycleId, 'revenue', {
    item: `${input.crop} yield sale`,
    qty: expectedYieldKg,
    unit: 'kg',
    unitCost: input.farmgatePriceBdtPerKg,
    total: grossRevenue,
    source: 'computed: base_yield × area × weather_adj × input_adj × farmgate_price',
    assumption:
      `base yield ${input.baseYieldKgPerHa} kg/ha × ${input.areaHa} ha × ` +
      `weather_adj ${input.weatherAdj} × input_adj ${input.inputAdj}`,
  });

  const lineItems: LedgerEntry[] = [
    ...input.costLineItems.map((e) => draftEntry(input.cropCycleId, 'cost', e)),
    revenueLine,
  ];

  return {
    lineItems,
    totalCost,
    expectedYieldKg,
    grossRevenue,
    netProfit,
    roi,
    bcr,
    breakEvenYieldKg,
    breakEvenPrice,
  };
}
