// tools/planning.tools.ts — lookup_crop_rules, rank_crops, build_season_plan.
// Class: 'deterministic'. Numbers come from data tables + engines, NEVER model recall (§C.6).
//
// Data-gap honesty notes (read before touching the fit-score math below):
//   - suitability.json/crop_rules.json have NO soil_type or water_source compatibility data
//     per crop yet. soilFit/waterFit use a neutral 0.7 default with an explicit assumption
//     until that data exists — not a guessed "real" compatibility score.
//   - data/rotation.json is still marked TEMPLATE/VERIFY. Its rules are used (they're the only
//     real data available) but every `_verify: true` rule surfaces in `assumptions`.
//   - get_weather only returns a 16-day forecast; suitability.json's rain_mm_season is a
//     season-long total. rainFit extrapolates the observed daily rate across the crop's
//     ~145-day season — flagged as an assumption, not presented as a season forecast.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import type { Provenance, ToolResult } from '@agrisense/shared';
import { register } from './registry';
import { FieldModel } from '../../models/field.model';
import { CropCycleModel } from '../../models/cropCycle.model';
import { PlanEventModel } from '../../models/planEvent.model';
import { SeasonPlanModel } from '../../models/seasonPlan.model';
import { getForecast } from '../external/openmeteo.client';
import { rankCrops, ecocropFit, type CropCandidateFit, type EcocropRange } from '../engines/ranking.engine';
import { irrigationSchedule } from '../engines/irrigation.engine';
import { buildPlan, computeStageDates, POST_TRANSPLANT_STAGES, type Stage } from '../engines/planner.engine';

// ─── data loading (mirrors field.tools.ts's districts.json pattern) ──────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../../../../../data');

function loadJson<T>(file: string): T {
  return JSON.parse(readFileSync(path.join(DATA_DIR, file), 'utf-8')) as T;
}

interface CropRule {
  label: string;
  label_bn?: string;
  season: string;
  calendar: {
    _verify?: boolean;
    sowing_window: { start: string; end: string };
    transplant_window: { start: string; end: string };
    harvest_window: { start: string; end: string };
  };
  stage_durations_days: Record<Stage, number> & { _verify?: boolean };
  fertilizer: {
    _verify?: boolean;
    unit: string;
    nutrients: Record<string, { dose: number; splits: { stage: string; fraction: number }[] }>;
    organic_alternatives?: unknown;
  };
  kc_by_stage: { initial: number; development: number; mid: number; late: number; _verify?: boolean };
  base_yield_kg_per_ha: { value: number; _source: string; _verify?: boolean };
}

interface CropRulesFile {
  crops: Record<string, CropRule>;
}

interface SuitabilityFile {
  crops: Record<string, { _verify?: boolean; temp_c: EcocropRange; rain_mm_season: EcocropRange; ph: EcocropRange }>;
}

interface RotationFile {
  rules: { prev: string; next: string; modifier: number; reason: string; _verify?: boolean }[];
}

interface CostsFile {
  fertilizer_prices_bdt_per_kg: Record<string, { value: number; source: string; _verify?: boolean }>;
  operations_bdt_per_ha: Record<string, { value: number; _verify?: boolean }>;
}

const ALL_STAGE_KEYS: Stage[] = ['nursery', ...POST_TRANSPLANT_STAGES];

const CROP_RULES = loadJson<CropRulesFile>('crop_rules.json');
const SUITABILITY = loadJson<SuitabilityFile>('suitability.json');
const ROTATION = loadJson<RotationFile>('rotation.json');
const COSTS = loadJson<CostsFile>('costs_bd.json');

// Standard FAO-56 Kc-curve phase correspondence for rice (initial/development/mid/late) —
// not from a specific citation, just the conventional mapping of the 4 broad Kc phases onto
// the 6 detailed agronomic stages this codebase tracks.
const STAGE_TO_KC_PHASE: Record<(typeof POST_TRANSPLANT_STAGES)[number], 'initial' | 'development' | 'mid' | 'late'> = {
  tillering: 'development',
  panicle_initiation: 'mid',
  booting: 'mid',
  flowering: 'mid',
  grain_filling: 'late',
  maturity: 'late',
};

// Standard fertilizer analysis percentages, cited directly in crop_rules.json's own
// fertilizer.carriers note (urea ~46% N, TSP ~46% P2O5, MoP ~60% K2O, gypsum ~18% S) —
// used here only for a rough, ranking-time cost estimate; compute_financials (Phase 4,
// Mahim's financial.engine) does the authoritative costing once a crop is chosen.
const NUTRIENT_TO_PRODUCT: Record<string, { product: string; pctNutrient: number }> = {
  N: { product: 'urea', pctNutrient: 0.46 },
  P: { product: 'tsp', pctNutrient: 0.46 },
  K: { product: 'mop', pctNutrient: 0.6 },
  S: { product: 'gypsum', pctNutrient: 0.18 },
};

const now = () => new Date().toISOString();
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

function addDaysToMonthDay(monthDay: string, year: number): Date {
  return new Date(`${year}-${monthDay}T00:00:00Z`);
}

/** Resolves a crop_rules.json MM-DD window-start into a real date: this year's if it's still
 * upcoming, otherwise next year's. Used for sowing/transplant/harvest when not overridden. */
function resolveYearFor(monthDay: string, referenceNow: Date): number {
  const year = referenceNow.getUTCFullYear();
  return addDaysToMonthDay(monthDay, year) < referenceNow ? year + 1 : year;
}

async function getTargetSeason(fieldId: string): Promise<string | null> {
  const cycles = await CropCycleModel.listByField(fieldId);
  const planned = cycles.find((c) => c.status === 'planned');
  return planned?.season ?? null;
}

// ─── lookup_crop_rules ─────────────────────────────────────────────────────────────────
const lookupCropRulesSchema = z.object({ crop: z.string().min(1) });

function cropRulesProvenance(crop: string): Provenance[] {
  return [
    { source: 'BARC Fertilizer Recommendation Guide (FRG) 2018', reference: `crops.${crop}.fertilizer`, method: 'table', retrievedAt: now() },
    { source: 'BAMIS crop-weather calendar / BRRI variety durations', reference: `crops.${crop}.calendar`, method: 'table', retrievedAt: now() },
    { source: 'FAO CROPWAT / FAO-56 crop coefficients', reference: `crops.${crop}.kc_by_stage`, method: 'table', retrievedAt: now() },
  ];
}

export function registerPlanningTools(): void {
  register({
    name: 'lookup_crop_rules',
    description: 'Windows, stage durations, fertilizer doses + splits, organic alternatives, Kc, and base yield for one crop from data/crop_rules.json.',
    schema: lookupCropRulesSchema,
    toolClass: 'deterministic',
    phases: ['PLANNING'],
    handler: async (args): Promise<ToolResult<CropRule>> => {
      const rule = CROP_RULES.crops[args.crop];
      if (!rule) {
        const known = Object.keys(CROP_RULES.crops).join(', ');
        throw new Error(`unknown crop "${args.crop}" — not in data/crop_rules.json (have: ${known})`);
      }
      const assumptions: string[] = [];
      if (rule.calendar._verify || rule.stage_durations_days._verify || rule.fertilizer._verify || rule.kc_by_stage._verify || rule.base_yield_kg_per_ha._verify) {
        assumptions.push(`${rule.label}'s figures are still pending verification against the source documents (data/crop_rules.json _verify flags) — confirm before relying on them for a live demo.`);
      }
      return { data: rule, provenance: cropRulesProvenance(args.crop), assumptions: assumptions.length ? assumptions : undefined };
    },
  });

  // ─── rank_crops ─────────────────────────────────────────────────────────────────────
  register({
    name: 'rank_crops',
    description: "Ranks every candidate crop for this field's target season and location against real weather, suitability, rotation history, and a rough budget check.",
    schema: z.object({}),
    toolClass: 'deterministic',
    phases: ['PLANNING'],
    handler: async (_args, ctx) => {
      const field = await FieldModel.getState(ctx.fieldId);
      const targetSeason = await getTargetSeason(ctx.fieldId);
      if (!targetSeason) {
        throw new Error('rank_crops called before the field has a target season — resolve intake first.');
      }
      const { lat, lon } = field.identity;
      if (lat == null || lon == null) {
        throw new Error('rank_crops called before the field has a location — resolve location first.');
      }

      const forecast = await getForecast(lat, lon);
      const avgTempC = average(forecast.daily.temperature_2m_max.map((tmax, i) => (tmax + forecast.daily.temperature_2m_min[i]!) / 2));
      const avgDailyRainMm = average(forecast.daily.precipitation_sum);

      const history = await CropCycleModel.history(ctx.fieldId);
      const prevCrop = history[0]?.crop ?? null;

      const candidateCrops = Object.keys(CROP_RULES.crops).filter((c) => c in SUITABILITY.crops);
      const provenance: Provenance[] = [
        { source: 'Open-Meteo (ECMWF)', method: 'api', retrievedAt: forecast.cachedAt },
        { source: 'FAO ECOCROP (data/suitability.json)', method: 'table', retrievedAt: now() },
        { source: 'data/crop_rules.json', reference: 'season, fertilizer doses', method: 'table', retrievedAt: now() },
      ];
      const assumptions = new Set<string>();

      const candidates: CropCandidateFit[] = candidateCrops.map((crop) => {
        const rule = CROP_RULES.crops[crop]!;
        const suit = SUITABILITY.crops[crop]!;
        if (suit._verify) assumptions.add(`${rule.label}'s suitability ranges are pending ECOCROP verification (data/suitability.json).`);

        const seasonFit = rule.season === targetSeason ? 1 : 0;
        const tempFit = ecocropFit(avgTempC, suit.temp_c);

        const seasonDays = ALL_STAGE_KEYS.reduce((sum, key) => sum + rule.stage_durations_days[key], 0);
        const estimatedSeasonRainMm = avgDailyRainMm * seasonDays;
        assumptions.add(`Rainfall fit for ${rule.label} extrapolates the current 16-day Open-Meteo forecast rate across the crop's ~${seasonDays}-day season — not a full-season forecast.`);
        const rainFit = ecocropFit(estimatedSeasonRainMm, suit.rain_mm_season);

        const soilFit = 0.7;
        const waterFit = 0.7;
        assumptions.add('Soil-type and water-source compatibility per crop are not in the data yet (crop_rules.json/suitability.json) — using a neutral 0.7 default for soil_fit/water_fit until that table exists.');

        const rotationFit = resolveRotationFit(prevCrop, crop, assumptions, provenance);

        const budgetPenalty = estimateBudgetPenalty(rule, field.identity.areaHa, field.identity.budgetBdt, assumptions);

        return { crop, seasonFit, rainFit, tempFit, soilFit, waterFit, rotationFit, budgetPenalty };
      });

      const result = rankCrops({ candidates });
      const ranked = result.ranked.map((c) => ({ ...c, label: CROP_RULES.crops[c.crop]!.label }));

      return {
        data: { ranked, weights: result.weights },
        provenance,
        assumptions: Array.from(assumptions),
      };
    },
  });

  // ─── build_season_plan ──────────────────────────────────────────────────────────────
  const buildSeasonPlanSchema = z.object({
    crop: z.string().min(1),
    sowingDate: z.string().optional().describe('ISO YYYY-MM-DD. Defaults to the crop\'s sowing window start date.'),
  });

  register({
    name: 'build_season_plan',
    description: "Builds the dated calendar (land prep → sowing → fertilizer splits → irrigation → harvest) for a chosen crop and activates the field's crop cycle.",
    schema: buildSeasonPlanSchema,
    toolClass: 'deterministic',
    phases: ['PLANNING', 'MAINTAINING'],
    handler: async (args, ctx) => {
      const rule = CROP_RULES.crops[args.crop];
      if (!rule) {
        const known = Object.keys(CROP_RULES.crops).join(', ');
        throw new Error(`unknown crop "${args.crop}" — not in data/crop_rules.json (have: ${known})`);
      }
      const field = await FieldModel.getState(ctx.fieldId);
      if (field.identity.areaHa == null || field.identity.lat == null || field.identity.lon == null) {
        throw new Error('build_season_plan called before the field has area/location — resolve intake first.');
      }

      const referenceNow = new Date();
      const sowYear = resolveYearFor(rule.calendar.sowing_window.start, referenceNow);
      const sowingDate = args.sowingDate ?? `${sowYear}-${rule.calendar.sowing_window.start}`;
      const transplantWindowStart = `${sowYear}-${rule.calendar.transplant_window.start}`;
      const harvestWindowStart = `${sowYear}-${rule.calendar.harvest_window.start}`;

      const forecast = await getForecast(field.identity.lat, field.identity.lon);
      const stageDates = computeStageDates(transplantWindowStart, rule.stage_durations_days);
      const irrigationByStage = estimateIrrigationForForecastWindow(forecast, stageDates, rule);

      const calendarSources: Provenance[] = [{ source: 'BAMIS crop-weather calendar / BRRI variety durations', reference: `crops.${args.crop}.calendar`, method: 'table', retrievedAt: now() }];
      const fertilizerSources: Provenance[] = [{ source: 'BARC Fertilizer Recommendation Guide (FRG) 2018', reference: `crops.${args.crop}.fertilizer`, method: 'table', retrievedAt: now() }];
      const irrigationSources: Provenance[] = [{ source: 'Open-Meteo (ECMWF)', method: 'api', retrievedAt: forecast.cachedAt }];

      const events = buildPlan({
        areaHa: field.identity.areaHa,
        sowingDate,
        stageDurationsDays: rule.stage_durations_days,
        transplantWindowStart,
        harvestWindowStart,
        fertilizer: rule.fertilizer.nutrients,
        irrigationByStage,
        sources: { calendar: calendarSources, fertilizer: fertilizerSources, irrigation: irrigationSources },
      });

      const cycle = await CropCycleModel.create(ctx.fieldId, {
        season: rule.season,
        crop: args.crop,
        sowingDate,
        expectedHarvest: harvestWindowStart,
        status: 'active',
      });

      const fullEvents = events.map((e) => ({ ...e, id: '', cropCycleId: cycle.id }));
      await PlanEventModel.replaceForCycle(cycle.id, fullEvents);
      const seasonPlan = await SeasonPlanModel.create(cycle.id, forecast);

      return {
        data: { cropCycleId: cycle.id, seasonPlanId: seasonPlan.id, revision: seasonPlan.revision, events: fullEvents },
        provenance: [...calendarSources, ...fertilizerSources, ...irrigationSources],
        assumptions: [
          `Land preparation is dated a week before sowing — a scheduling default, not from a cited source.`,
          `Irrigation is estimated only for the stage(s) covered by the current 16-day Open-Meteo forecast; later stages need a closer-to-the-date forecast.`,
        ],
      };
    },
  });
}

function average(values: number[]): number {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
}

function resolveRotationFit(prevCrop: string | null, nextCrop: string, assumptions: Set<string>, provenance: Provenance[]): number {
  if (!prevCrop) return 0.5; // no history — neutral, not a guess
  const rule = ROTATION.rules.find((r) => r.prev === prevCrop && r.next === nextCrop);
  if (!rule) return 0.5;
  provenance.push({ source: 'data/rotation.json', reference: `${prevCrop}→${nextCrop}`, method: 'table', retrievedAt: now() });
  if (rule._verify) {
    assumptions.add(`The ${prevCrop}→${nextCrop} rotation adjustment (data/rotation.json) is pending agronomic verification.`);
  }
  return clamp01(0.5 + rule.modifier);
}

function estimateBudgetPenalty(rule: CropRule, areaHa: number | null, budgetBdt: number | null, assumptions: Set<string>): number {
  if (areaHa == null || budgetBdt == null || budgetBdt <= 0) return 0;
  let cost = 0;
  let complete = true;
  for (const opKey of ['land_prep_tillage', 'transplanting_labor', 'weeding', 'harvest_threshing']) {
    const op = COSTS.operations_bdt_per_ha[opKey];
    if (op) cost += op.value * areaHa;
    else complete = false;
  }
  for (const [nutrient, data] of Object.entries(rule.fertilizer.nutrients)) {
    const conv = NUTRIENT_TO_PRODUCT[nutrient];
    const price = conv ? COSTS.fertilizer_prices_bdt_per_kg[conv.product] : undefined;
    if (conv && price) {
      const productKg = (data.dose / conv.pctNutrient) * areaHa;
      cost += productKg * price.value;
    } else {
      complete = false;
    }
  }
  if (!complete) {
    assumptions.add(`${rule.label}'s rough cost estimate (used only to rank crops) is incomplete — some cost lines are missing from data/costs_bd.json. compute_financials gives the authoritative figure once a crop is chosen.`);
  }
  return cost > budgetBdt ? (cost - budgetBdt) / budgetBdt : 0;
}

/** Only estimates irrigation for whichever post-transplant stage the 16-day forecast window
 * actually falls in — stages beyond that horizon get no fabricated irrigation figure. */
function estimateIrrigationForForecastWindow(
  forecast: Awaited<ReturnType<typeof getForecast>>,
  stageDates: Record<string, string>,
  rule: CropRule,
): Partial<Record<Stage, number>> {
  const forecastStart = forecast.daily.time[0];
  if (!forecastStart) return {};

  let currentStage: (typeof POST_TRANSPLANT_STAGES)[number] | null = null;
  for (const stage of POST_TRANSPLANT_STAGES) {
    if (stageDates[stage]! <= forecastStart) currentStage = stage;
  }
  if (!currentStage) return {};

  const kc = rule.kc_by_stage[STAGE_TO_KC_PHASE[currentStage]];
  const days = forecast.daily.time.map((date, i) => ({
    date,
    et0: forecast.daily.et0_fao_evapotranspiration[i]!,
    kc,
    rainfallMm: forecast.daily.precipitation_sum[i]!,
  }));
  const { totalIrrigationMm } = irrigationSchedule(days);
  return { [currentStage]: totalIrrigationMm };
}
