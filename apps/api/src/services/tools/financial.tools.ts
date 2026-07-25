// tools/financial.tools.ts — compute_financials. Class: 'deterministic' (§C.9, Tier-0 #5).
// Reads real cost/dose tables (data/crop_rules.json, data/costs_bd.json) and persists the
// projection — the engine itself (financial.engine.ts) stays pure; this is the one place
// that touches the filesystem and the ledger.
// simulate_scenario (mutated-input variant, reusing this same engine) is Tier 1 (§A.1) —
// lands in Phase 8 behind scenario.controller.ts, not registered here yet.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import type { FinancialResult, ToolResult } from '@agrisense/shared';
import { register } from './registry';
import { FieldModel } from '../../models/field.model';
import { LedgerModel } from '../../models/ledger.model';
import { computeFinancials, type CostLineItemInput } from '../engines/financial.engine';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(__dirname, '../../../../../data');

interface CropRulesFile {
  crops: Record<
    string,
    {
      fertilizer: { nutrients: Record<string, { dose: number }> };
      base_yield_kg_per_ha: { value: number };
    }
  >;
}

interface CostsBdFile {
  fertilizer_prices_bdt_per_kg: Record<string, { value: number }>;
  operations_bdt_per_ha: Record<string, { value: number }>;
  seed: Record<string, { rate_kg_per_ha: number; price_bdt_per_kg: number }>;
  irrigation: { diesel_pump_bdt_per_ha: { value: number } };
  farmgate_prices_bdt_per_kg: Record<string, { value: number }>;
}

function loadJson<T>(file: string): T {
  return JSON.parse(readFileSync(path.join(dataDir, file), 'utf-8')) as T;
}

// Standard fertilizer product nutrient-content grades (universal chemistry, not a local
// estimate) — matches crop_rules.json's fertilizer.carriers._note.
const CARRIER_NUTRIENT_PCT: Record<string, number> = { urea: 0.46, tsp: 0.46, mop: 0.6, gypsum: 0.18 };
const NUTRIENT_CARRIER: Record<string, string> = { N: 'urea', P: 'tsp', K: 'mop', S: 'gypsum' };

const computeFinancialsSchema = z.object({
  weatherAdj: z
    .number()
    .positive()
    .optional()
    .describe('Yield multiplier for current weather conditions (1.0 = normal). Defaults to 1.0.'),
  inputAdj: z
    .number()
    .positive()
    .optional()
    .describe('Yield multiplier for input quality/access (1.0 = standard). Defaults to 1.0.'),
});

export function registerFinancialTools(): void {
  register({
    name: 'compute_financials',
    description:
      'Computes itemized costs (fertilizer, seed, land prep, labor, irrigation), expected revenue, ' +
      "net profit, ROI, BCR, and break-even for the field's active crop cycle, from real BARC/BBS-" +
      'sourced cost tables — and persists it as the season financial projection.',
    schema: computeFinancialsSchema,
    toolClass: 'deterministic',
    phases: ['PLANNING', 'MAINTAINING'],
    handler: async (args, ctx): Promise<ToolResult<FinancialResult>> => {
      const field = await FieldModel.getState(ctx.fieldId);
      const cycle = field.activeCycle;
      if (!cycle) {
        throw new Error('compute_financials called with no active crop cycle — a crop must be chosen first.');
      }
      if (!cycle.crop) {
        throw new Error(`compute_financials called before a crop was chosen for cycle ${cycle.id}.`);
      }
      const areaHa = field.identity.areaHa;
      if (areaHa == null) {
        throw new Error('compute_financials called before the field has an area — resolve area_ha first.');
      }

      const cropRules = loadJson<CropRulesFile>('crop_rules.json');
      const costsBd = loadJson<CostsBdFile>('costs_bd.json');
      const cropKey = cycle.crop;

      const rules = cropRules.crops[cropKey];
      if (!rules) {
        throw new Error(
          `no crop_rules.json entry for crop "${cropKey}" — only ${Object.keys(cropRules.crops).join(', ')} modeled so far.`,
        );
      }
      const farmgate = costsBd.farmgate_prices_bdt_per_kg[cropKey];
      if (!farmgate) {
        throw new Error(`no costs_bd.json farmgate price for crop "${cropKey}".`);
      }

      const costLineItems: CostLineItemInput[] = [];

      for (const [nutrient, spec] of Object.entries(rules.fertilizer.nutrients)) {
        const carrier = NUTRIENT_CARRIER[nutrient];
        const pct = carrier ? CARRIER_NUTRIENT_PCT[carrier] : undefined;
        const priceEntry = carrier ? costsBd.fertilizer_prices_bdt_per_kg[carrier] : undefined;
        if (!carrier || !pct || !priceEntry) continue;
        const productKg = (spec.dose * areaHa) / pct;
        costLineItems.push({
          item: `${carrier} (for ${nutrient})`,
          qty: Number(productKg.toFixed(2)),
          unit: 'kg',
          unitCost: priceEntry.value,
          total: Number((productKg * priceEntry.value).toFixed(2)),
          source: `crop_rules.json (${cropKey}.fertilizer.nutrients.${nutrient}) + costs_bd.json (${carrier})`,
          assumption: `${spec.dose} kg/ha ${nutrient} ÷ ${(pct * 100).toFixed(0)}% ${carrier} content × ${areaHa} ha`,
        });
      }

      for (const [op, spec] of Object.entries(costsBd.operations_bdt_per_ha)) {
        costLineItems.push({
          item: op,
          qty: areaHa,
          unit: 'ha',
          unitCost: spec.value,
          total: Number((spec.value * areaHa).toFixed(2)),
          source: 'costs_bd.json (operations_bdt_per_ha)',
          assumption: `${spec.value} BDT/ha × ${areaHa} ha`,
        });
      }

      const seed = costsBd.seed[cropKey];
      if (seed) {
        const seedKg = seed.rate_kg_per_ha * areaHa;
        costLineItems.push({
          item: 'seed',
          qty: Number(seedKg.toFixed(2)),
          unit: 'kg',
          unitCost: seed.price_bdt_per_kg,
          total: Number((seedKg * seed.price_bdt_per_kg).toFixed(2)),
          source: 'costs_bd.json (seed)',
          assumption: `${seed.rate_kg_per_ha} kg/ha × ${areaHa} ha`,
        });
      }

      const irrigationRate = costsBd.irrigation.diesel_pump_bdt_per_ha.value;
      costLineItems.push({
        item: 'supplemental irrigation (diesel pump)',
        qty: areaHa,
        unit: 'ha',
        unitCost: irrigationRate,
        total: Number((irrigationRate * areaHa).toFixed(2)),
        source: 'costs_bd.json (irrigation.diesel_pump_bdt_per_ha)',
        assumption: `${irrigationRate} BDT/ha × ${areaHa} ha`,
      });

      const result = computeFinancials({
        cropCycleId: cycle.id,
        crop: cropKey,
        season: cycle.season ?? 'unknown',
        areaHa,
        baseYieldKgPerHa: rules.base_yield_kg_per_ha.value,
        farmgatePriceBdtPerKg: farmgate.value,
        weatherAdj: args.weatherAdj ?? 1.0,
        inputAdj: args.inputAdj ?? 1.0,
        costLineItems,
      });

      await LedgerModel.replaceProjection(cycle.id, result.lineItems);

      const now = new Date().toISOString();
      return {
        data: result,
        provenance: [
          { source: 'data/crop_rules.json', method: 'table', retrievedAt: now },
          { source: 'data/costs_bd.json', method: 'table', retrievedAt: now },
          { source: 'financial.engine.ts (computeFinancials)', method: 'computed', retrievedAt: now },
        ],
      };
    },
  });
}
