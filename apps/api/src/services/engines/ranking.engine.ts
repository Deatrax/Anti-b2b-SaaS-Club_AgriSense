// engines/ranking.engine.ts — PURE (§C.9). Transparent weighted suitability score.
// Return every sub-score AND the weights — being interrogable IS the credibility.
//
// This engine does no data reading and no domain judgment of its own: every sub-score
// (season/rain/temp/soil/water/rotation fit, budget penalty) arrives already resolved by
// the tool layer (planning.tools.ts), which is where crop_rules.json/suitability.json/
// rotation.json/get_weather actually get consulted. The engine is just the weighted sum
// and the ranking — kept pure so it's trivially unit-tested (§C.9's mandate).

/** score = 0.28·season_fit + 0.24·rain_fit + 0.18·temp_fit + 0.14·soil_fit + 0.10·water_fit + 0.06·rotation_fit − budget_penalty */
export const RANK_WEIGHTS = {
  seasonFit: 0.28,
  rainFit: 0.24,
  tempFit: 0.18,
  soilFit: 0.14,
  waterFit: 0.1,
  rotationFit: 0.06,
} as const;

export interface CropCandidateFit {
  crop: string;
  /** 1.0 if the crop's typical season matches the field's target season, else 0.0. */
  seasonFit: number;
  /** 0–1, from an ECOCROP-style min/opt/max range against actual forecast rainfall. */
  rainFit: number;
  /** 0–1, from an ECOCROP-style min/opt/max range against actual forecast temperature. */
  tempFit: number;
  /** 0–1. */
  soilFit: number;
  /** 0–1. */
  waterFit: number;
  /** 0–1, 0.5 = neutral/no rotation history; above/below nudged by data/rotation.json. */
  rotationFit: number;
  /** 0+, subtracted directly (not weighted) — how far the estimated cost exceeds budget. */
  budgetPenalty: number;
}

export interface CropScore extends CropCandidateFit {
  score: number;
}

export interface RankInput {
  candidates: CropCandidateFit[];
}

export interface RankResult {
  ranked: CropScore[];
  weights: typeof RANK_WEIGHTS;
}

export function rankCrops(input: RankInput): RankResult {
  const ranked = input.candidates
    .map((c) => ({
      ...c,
      score:
        RANK_WEIGHTS.seasonFit * c.seasonFit +
        RANK_WEIGHTS.rainFit * c.rainFit +
        RANK_WEIGHTS.tempFit * c.tempFit +
        RANK_WEIGHTS.soilFit * c.soilFit +
        RANK_WEIGHTS.waterFit * c.waterFit +
        RANK_WEIGHTS.rotationFit * c.rotationFit -
        c.budgetPenalty,
    }))
    .sort((a, b) => b.score - a.score);
  return { ranked, weights: RANK_WEIGHTS };
}

export interface EcocropRange {
  min: number;
  opt_low: number;
  opt_high: number;
  max: number;
}

/**
 * ECOCROP-style trapezoidal suitability: 1.0 inside [opt_low, opt_high], linearly falling to
 * 0 at min/max, 0 outside [min, max]. Standard shape for min-opt-max environmental ranges.
 */
export function ecocropFit(value: number, range: EcocropRange): number {
  if (value < range.min || value > range.max) return 0;
  if (value >= range.opt_low && value <= range.opt_high) return 1;
  if (value < range.opt_low) {
    return (value - range.min) / (range.opt_low - range.min);
  }
  return (range.max - value) / (range.max - range.opt_high);
}
