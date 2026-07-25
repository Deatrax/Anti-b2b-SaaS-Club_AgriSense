// THE test that scores (§C.9): a transparent, arguable model beats an opaque one — being
// interrogable IS the credibility. Every sub-score + the weights must come back on the result.
import { describe, it, expect } from 'vitest';
import { rankCrops, ecocropFit, RANK_WEIGHTS, type CropCandidateFit } from '../src/services/engines/ranking.engine';

function perfectFit(overrides: Partial<CropCandidateFit> = {}): CropCandidateFit {
  return {
    crop: 'aman_rice',
    seasonFit: 1,
    rainFit: 1,
    tempFit: 1,
    soilFit: 1,
    waterFit: 1,
    rotationFit: 1,
    budgetPenalty: 0,
    ...overrides,
  };
}

describe('rankCrops (§C.9 weighted formula)', () => {
  it('weights sum to exactly 1.0 so a perfect-fit, zero-penalty candidate scores exactly 1.0', () => {
    const sum = Object.values(RANK_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 10);

    const { ranked } = rankCrops({ candidates: [perfectFit()] });
    expect(ranked[0]!.score).toBeCloseTo(1.0, 10);
  });

  it('a zero-fit, zero-penalty candidate scores exactly 0', () => {
    const { ranked } = rankCrops({
      candidates: [perfectFit({ seasonFit: 0, rainFit: 0, tempFit: 0, soilFit: 0, waterFit: 0, rotationFit: 0 })],
    });
    expect(ranked[0]!.score).toBe(0);
  });

  it('budget_penalty subtracts directly, not weighted', () => {
    const { ranked } = rankCrops({ candidates: [perfectFit({ budgetPenalty: 0.2 })] });
    expect(ranked[0]!.score).toBeCloseTo(0.8, 10);
  });

  it('changing one sub-score changes only its own weighted contribution (Tier-0 #5 consistency)', () => {
    const base = rankCrops({ candidates: [perfectFit()] }).ranked[0]!.score;
    const withHalfRain = rankCrops({ candidates: [perfectFit({ rainFit: 0.5 })] }).ranked[0]!.score;
    expect(base - withHalfRain).toBeCloseTo(RANK_WEIGHTS.rainFit * 0.5, 10);
  });

  it('ranks candidates descending by score', () => {
    const { ranked } = rankCrops({
      candidates: [
        perfectFit({ crop: 'low', seasonFit: 0.2 }),
        perfectFit({ crop: 'high' }),
        perfectFit({ crop: 'mid', seasonFit: 0.6 }),
      ],
    });
    expect(ranked.map((c) => c.crop)).toEqual(['high', 'mid', 'low']);
  });

  it('returns every sub-score and the weights on the result — the credibility is in being interrogable', () => {
    const result = rankCrops({ candidates: [perfectFit({ crop: 'aman_rice' })] });
    expect(result.weights).toBe(RANK_WEIGHTS);
    expect(result.ranked[0]).toMatchObject({
      crop: 'aman_rice',
      seasonFit: 1,
      rainFit: 1,
      tempFit: 1,
      soilFit: 1,
      waterFit: 1,
      rotationFit: 1,
      budgetPenalty: 0,
    });
  });
});

describe('ecocropFit (min/opt_low/opt_high/max trapezoidal suitability)', () => {
  // aman_rice's real temp_c range from data/suitability.json
  const tempC = { min: 20, opt_low: 25, opt_high: 32, max: 38 };

  it('scores 1.0 anywhere inside the optimal band', () => {
    expect(ecocropFit(25, tempC)).toBe(1);
    expect(ecocropFit(28, tempC)).toBe(1);
    expect(ecocropFit(32, tempC)).toBe(1);
  });

  it('scores 0 at and beyond the absolute min/max', () => {
    expect(ecocropFit(20, tempC)).toBe(0);
    expect(ecocropFit(38, tempC)).toBe(0);
    expect(ecocropFit(15, tempC)).toBe(0);
    expect(ecocropFit(40, tempC)).toBe(0);
  });

  it('interpolates linearly on the rising edge (min → opt_low)', () => {
    expect(ecocropFit(22.5, tempC)).toBeCloseTo(0.5, 10); // midpoint of 20–25
  });

  it('interpolates linearly on the falling edge (opt_high → max)', () => {
    expect(ecocropFit(35, tempC)).toBeCloseTo(0.5, 10); // midpoint of 32–38
  });
});
