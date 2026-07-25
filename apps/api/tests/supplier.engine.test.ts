// apps/api/tests/supplier.engine.test.ts — mirrors ranking.engine.test.ts's philosophy:
// every sub-score + the weights come back on the result. Unlike crop fit's absolute ECOCROP
// ranges, supplier price/delivery/distance have no absolute "ideal" — they're normalized
// relative to the candidate set, which these tests pin down explicitly.
import { describe, it, expect } from 'vitest';
import { rankSuppliers, haversineKm, SUPPLIER_WEIGHTS, type SupplierCandidate } from '../src/services/engines/supplier.engine';

function candidate(overrides: Partial<SupplierCandidate> = {}): SupplierCandidate {
  return {
    supplierId: 'sup_a',
    name: 'Supplier A',
    district: 'Dhaka',
    priceBdtPerKg: 27,
    deliveryDays: 2,
    distanceKm: 10,
    rating: 4,
    ...overrides,
  };
}

describe('rankSuppliers (relative-normalization weighted formula)', () => {
  it('weights sum to exactly 1.0', () => {
    const sum = Object.values(SUPPLIER_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 10);
  });

  it('the best candidate in every dimension (incl. a perfect 5 rating) scores exactly 1.0', () => {
    const best = candidate({ supplierId: 'best', priceBdtPerKg: 20, deliveryDays: 1, distanceKm: 5, rating: 5 });
    const worst = candidate({ supplierId: 'worst', priceBdtPerKg: 40, deliveryDays: 6, distanceKm: 100, rating: 1 });
    const { ranked } = rankSuppliers([best, worst]);
    expect(ranked[0]!.supplierId).toBe('best');
    expect(ranked[0]!.score).toBeCloseTo(1.0, 10);
  });

  it('the worst candidate in every dimension (incl. rating 0) scores exactly 0', () => {
    const best = candidate({ supplierId: 'best', priceBdtPerKg: 20, deliveryDays: 1, distanceKm: 5, rating: 5 });
    const worst = candidate({ supplierId: 'worst', priceBdtPerKg: 40, deliveryDays: 6, distanceKm: 100, rating: 0 });
    const { ranked } = rankSuppliers([best, worst]);
    const worstResult = ranked.find((r) => r.supplierId === 'worst')!;
    expect(worstResult.score).toBeCloseTo(0, 10);
  });

  it('a single candidate (or an all-tied set) normalizes price/delivery/distance to 1.0 — no worse alternative to be behind', () => {
    const { ranked } = rankSuppliers([candidate({ rating: 5 })]);
    expect(ranked[0]!.subScores).toEqual({ price: 1, delivery: 1, distance: 1, rating: 1 });
    expect(ranked[0]!.score).toBeCloseTo(1.0, 10);
  });

  it('returns every sub-score and the fixed weights — being interrogable is the credibility', () => {
    const result = rankSuppliers([candidate()]);
    expect(result.weights).toBe(SUPPLIER_WEIGHTS);
    expect(result.ranked[0]).toHaveProperty('subScores');
  });

  it('ranks descending by score', () => {
    const cheap = candidate({ supplierId: 'cheap', priceBdtPerKg: 20 });
    const mid = candidate({ supplierId: 'mid', priceBdtPerKg: 30 });
    const pricey = candidate({ supplierId: 'pricey', priceBdtPerKg: 40 });
    const { ranked } = rankSuppliers([mid, pricey, cheap]);
    expect(ranked.map((r) => r.supplierId)).toEqual(['cheap', 'mid', 'pricey']);
  });

  it('returns an empty ranking for an empty candidate list, still carrying the weights', () => {
    const result = rankSuppliers([]);
    expect(result.ranked).toEqual([]);
    expect(result.weights).toBe(SUPPLIER_WEIGHTS);
  });
});

describe('haversineKm', () => {
  it('is 0 for the same point', () => {
    expect(haversineKm(23.8103, 90.4125, 23.8103, 90.4125)).toBeCloseTo(0, 6);
  });

  it('is a plausible straight-line distance for Dhaka → Chittagong (real district centroids)', () => {
    // Dhaka 23.8103,90.4125 ; Chittagong 22.3569,91.7832 — real straight-line distance ≈ 214km.
    const km = haversineKm(23.8103, 90.4125, 22.3569, 91.7832);
    expect(km).toBeGreaterThan(190);
    expect(km).toBeLessThan(240);
  });
});
