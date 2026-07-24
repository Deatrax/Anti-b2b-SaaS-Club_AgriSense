// engines/pest.engine.ts — PURE. Deterministic if-then from pest_rules.json thresholds × forecast.
// No I/O: risk.tools.ts reads pest_rules.json and aggregates the Open-Meteo forecast into
// per-day figures; this only matches rule thresholds against already-prepared days.

export interface ForecastDay {
  date: string;
  tempMaxC: number;
  tempMinC: number;
  /** Daily-average relative humidity, aggregated from Open-Meteo's hourly series. Null if
   * the forecast didn't cover this day (never fabricated). */
  humidityPctAvg: number | null;
  precipitationMm: number;
}

export interface PestRuleSource {
  source: string;
  reference?: string;
  method: string;
}

export interface PestRule {
  pest: string;
  crop: string;
  stages: string[];
  trigger: { temp_c: [number, number]; rh_min_pct?: number; after_heavy_rain?: boolean };
  level: 'low' | 'elevated' | 'high';
  prevention: string;
  treatment: string;
  est_cost_bdt_per_ha: number;
  sources: PestRuleSource[];
}

export interface RiskWindowDraft {
  pest: string;
  level: 'low' | 'elevated' | 'high';
  startsOn: string | null;
  endsOn: string | null;
  trigger: unknown;
  prevention: string | null;
  treatment: string | null;
  estCostBdt: number | null;
  sources: PestRuleSource[];
}

// A commonly used agronomic "heavy rainfall" threshold for triggering leaf-wetness-driven
// disease risk — an engineering default (not itself a cited figure) since pest_rules.json's
// `after_heavy_rain` flag is boolean, not a threshold value.
const HEAVY_RAIN_MM = 20;

export function assessPestRisk(crop: string, currentStage: string | null, rules: PestRule[], forecastDays: ForecastDay[]): RiskWindowDraft[] {
  const windows: RiskWindowDraft[] = [];

  for (const rule of rules) {
    if (rule.crop !== crop) continue;
    if (currentStage && !rule.stages.includes(currentStage)) continue;

    const [tMin, tMax] = rule.trigger.temp_c;
    const matchingDays = forecastDays.filter((day, i) => {
      const tempOk = day.tempMaxC >= tMin && day.tempMinC <= tMax;
      const rhOk = rule.trigger.rh_min_pct == null || (day.humidityPctAvg != null && day.humidityPctAvg >= rule.trigger.rh_min_pct);
      const rainOk = !rule.trigger.after_heavy_rain || (i > 0 && forecastDays[i - 1]!.precipitationMm >= HEAVY_RAIN_MM);
      return tempOk && rhOk && rainOk;
    });
    if (matchingDays.length === 0) continue;

    windows.push({
      pest: rule.pest,
      level: rule.level,
      startsOn: matchingDays[0]!.date,
      endsOn: matchingDays[matchingDays.length - 1]!.date,
      trigger: rule.trigger,
      prevention: rule.prevention,
      treatment: rule.treatment,
      estCostBdt: rule.est_cost_bdt_per_ha,
      sources: rule.sources,
    });
  }

  return windows;
}
