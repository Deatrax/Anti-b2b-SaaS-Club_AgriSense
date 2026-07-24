// THE test that scores (§C.9): "change an input → outputs change correctly" (Tier-0 #5).
import { describe, it, expect } from 'vitest';
import { computeFinancials, type CostLineItemInput, type FinancialInput } from '../src/services/engines/financial.engine';

function lineItemsForArea(areaHa: number): CostLineItemInput[] {
  const fertilizerPerHa = 5000;
  const laborPerHa = 8000;
  return [
    {
      item: 'urea',
      qty: 100 * areaHa,
      unit: 'kg',
      unitCost: 27,
      total: fertilizerPerHa * areaHa,
      source: 'test fixture',
      assumption: 'test fixture',
    },
    {
      item: 'labor',
      qty: areaHa,
      unit: 'ha',
      unitCost: laborPerHa,
      total: laborPerHa * areaHa,
      source: 'test fixture',
      assumption: 'test fixture',
    },
  ];
}

function baseInput(overrides: Partial<FinancialInput> = {}): FinancialInput {
  return {
    cropCycleId: 'cycle-1',
    crop: 'aman_rice',
    season: 'aman',
    areaHa: 1,
    baseYieldKgPerHa: 3000,
    farmgatePriceBdtPerKg: 34,
    weatherAdj: 1,
    inputAdj: 1,
    costLineItems: lineItemsForArea(1),
    ...overrides,
  };
}

describe('financial.engine (§C.9 — the test that scores)', () => {
  it('doubling area doubles total cost', () => {
    const at1 = computeFinancials(baseInput({ areaHa: 1, costLineItems: lineItemsForArea(1) }));
    const at2 = computeFinancials(baseInput({ areaHa: 2, costLineItems: lineItemsForArea(2) }));
    expect(at2.totalCost).toBeCloseTo(at1.totalCost * 2);
  });

  it('net_profit = gross_revenue − total_cost', () => {
    const result = computeFinancials(baseInput());
    expect(result.netProfit).toBeCloseTo(result.grossRevenue - result.totalCost);
  });

  it('bcr = gross_revenue / total_cost', () => {
    const result = computeFinancials(baseInput());
    expect(result.bcr).toBeCloseTo(result.grossRevenue / result.totalCost);
  });

  it('break_even_yield × farmgate_price = total_cost', () => {
    const result = computeFinancials(baseInput());
    expect(result.breakEvenYieldKg * 34).toBeCloseTo(result.totalCost);
  });

  it('zero area does not divide by zero', () => {
    const result = computeFinancials(
      baseInput({ areaHa: 0, costLineItems: [{ item: 'fixed cost', qty: null, unit: null, unitCost: null, total: 1000, source: 't', assumption: 't' }] }),
    );
    expect(result.expectedYieldKg).toBe(0);
    expect(Number.isFinite(result.breakEvenPrice)).toBe(true);
    expect(Number.isNaN(result.breakEvenPrice)).toBe(false);
    expect(result.breakEvenPrice).toBe(0);
    expect(Number.isFinite(result.roi)).toBe(true);
    expect(Number.isFinite(result.bcr)).toBe(true);
  });

  it('an input override propagates to every dependent figure', () => {
    const baseline = computeFinancials(baseInput());
    const droughtYear = computeFinancials(baseInput({ weatherAdj: 0.7 }));

    expect(droughtYear.expectedYieldKg).not.toBeCloseTo(baseline.expectedYieldKg);
    expect(droughtYear.grossRevenue).not.toBeCloseTo(baseline.grossRevenue);
    expect(droughtYear.netProfit).not.toBeCloseTo(baseline.netProfit);
    expect(droughtYear.roi).not.toBeCloseTo(baseline.roi);
    expect(droughtYear.bcr).not.toBeCloseTo(baseline.bcr);
    expect(droughtYear.breakEvenPrice).not.toBeCloseTo(baseline.breakEvenPrice);
    // totalCost and breakEvenYieldKg don't depend on yield/weather — unaffected by this override.
    expect(droughtYear.totalCost).toBeCloseTo(baseline.totalCost);
  });

  it('Boro HYV sanity anchor: BCR ≈ 1.9–2.3', () => {
    // Illustrative Boro HYV figures (yield ~5.5 t/ha, paddy ~28 BDT/kg, total cost ~75,000 BDT/ha)
    // chosen to land in the documented real-world anchor range — this checks the engine's
    // arithmetic reproduces a known sanity-checked ratio, not a locally-verified Boro dataset
    // (Boro isn't the demo crop; crop_rules/costs_bd only model aman_rice so far).
    const result = computeFinancials(
      baseInput({
        crop: 'boro_rice_hyv_illustrative',
        baseYieldKgPerHa: 5500,
        farmgatePriceBdtPerKg: 28,
        costLineItems: [
          { item: 'illustrative boro input cost', qty: null, unit: null, unitCost: null, total: 75000, source: 'illustrative', assumption: 'illustrative' },
        ],
      }),
    );
    expect(result.bcr).toBeGreaterThanOrEqual(1.9);
    expect(result.bcr).toBeLessThanOrEqual(2.3);
  });
});
