// tools/risk.tools.ts — assess_pest_risk. Class: 'deterministic' (§A.1 T1 gap).
// Forward-looking: stage × forecast against pest_rules.json thresholds → RiskWindow rows.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import type { Provenance, RiskWindow, ToolResult } from '@agrisense/shared';
import { register } from './registry';
import { FieldModel } from '../../models/field.model';
import { RiskWindowModel } from '../../models/riskWindow.model';
import { getForecast, type Forecast } from '../external/openmeteo.client';
import { assessPestRisk, type ForecastDay, type PestRule } from '../engines/pest.engine';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../../../../../data');

interface PestRulesFile {
  rules: PestRule[];
}

const PEST_RULES = JSON.parse(readFileSync(path.join(DATA_DIR, 'pest_rules.json'), 'utf-8')) as PestRulesFile;

/** Groups Open-Meteo's hourly RH series by calendar day (matching hourly.time's date prefix
 * against daily.time) into a per-day average — the forecast only gives hourly RH, not daily. */
function dailyHumidity(forecast: Forecast): Map<string, number> {
  const sums = new Map<string, { total: number; count: number }>();
  forecast.hourly.time.forEach((ts, i) => {
    const date = ts.slice(0, 10);
    const rh = forecast.hourly.relative_humidity_2m[i];
    if (rh == null) return;
    const entry = sums.get(date) ?? { total: 0, count: 0 };
    entry.total += rh;
    entry.count += 1;
    sums.set(date, entry);
  });
  const avgs = new Map<string, number>();
  for (const [date, { total, count }] of sums) avgs.set(date, total / count);
  return avgs;
}

function toForecastDays(forecast: Forecast): ForecastDay[] {
  const rh = dailyHumidity(forecast);
  return forecast.daily.time.map((date, i) => ({
    date,
    tempMaxC: forecast.daily.temperature_2m_max[i]!,
    tempMinC: forecast.daily.temperature_2m_min[i]!,
    humidityPctAvg: rh.get(date) ?? null,
    precipitationMm: forecast.daily.precipitation_sum[i]!,
  }));
}

const assessPestRiskSchema = z.object({});

export function registerRiskTools(): void {
  register({
    name: 'assess_pest_risk',
    description: "Forward-looking pest/disease risk for the field's crop and current growth stage, from the 16-day forecast against IRRI/EPIRICE thresholds.",
    schema: assessPestRiskSchema,
    toolClass: 'deterministic',
    phases: ['MAINTAINING'],
    handler: async (_args, ctx): Promise<ToolResult<RiskWindow[]>> => {
      const field = await FieldModel.getState(ctx.fieldId);
      const cycle = field.activeCycle;
      if (!cycle || !cycle.crop) {
        throw new Error('assess_pest_risk called with no active crop cycle — a crop must be chosen first.');
      }
      const { lat, lon } = field.identity;
      if (lat == null || lon == null) {
        throw new Error('assess_pest_risk called before the field has a location — resolve location first.');
      }

      const forecast = await getForecast(lat, lon);
      const forecastDays = toForecastDays(forecast);
      const drafts = assessPestRisk(cycle.crop, cycle.stage, PEST_RULES.rules, forecastDays);

      const windows: RiskWindow[] = drafts.map((d) => ({
        id: '',
        cropCycleId: cycle.id,
        pest: d.pest,
        level: d.level,
        startsOn: d.startsOn,
        endsOn: d.endsOn,
        trigger: d.trigger,
        prevention: d.prevention,
        treatment: d.treatment,
        estCostBdt: d.estCostBdt,
        sources: d.sources as Provenance[],
      }));

      await RiskWindowModel.replaceForCycle(cycle.id, windows);

      const provenance: Provenance[] = [
        { source: 'Open-Meteo (ECMWF)', method: 'api', retrievedAt: forecast.cachedAt },
        { source: 'data/pest_rules.json (IRRI Rice Knowledge Bank + EPIRICE)', method: 'table', retrievedAt: new Date().toISOString() },
      ];

      return {
        data: windows,
        provenance,
        assumptions:
          windows.length > 0
            ? ['Pest thresholds in data/pest_rules.json are still pending full agronomic verification (`_verify: true`) — treat as directional, confirm before advising a treatment spend.']
            : undefined,
      };
    },
  });
}
