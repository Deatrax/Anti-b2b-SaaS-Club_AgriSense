// engines/ranking.engine.ts — PURE (§C.9). Transparent weighted suitability score.
// Return every sub-score AND the weights — being interrogable IS the credibility.

export interface RankInput {
  // TODO: candidate crops, season, weather summary, soilType, waterSource, rotation history, budget.
  [k: string]: unknown;
}

// score = 0.28·season_fit + 0.24·rain_fit + 0.18·temp_fit
//       + 0.14·soil_fit  + 0.10·water_fit + 0.06·rotation_fit − budget_penalty
export function rankCrops(_input: RankInput): unknown {
  // TODO: score each candidate over suitability.json + rotation.json; return ranked list + sub-scores.
  throw new Error('rankCrops not implemented (§C.9)');
}
