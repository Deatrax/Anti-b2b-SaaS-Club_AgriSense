// C — scenario simulation ("what if budget cut 40%?"). Returns a before/after diff (§A.1 T1).
// Reuses financial.engine.ts directly — a scenario is the same pure formula under mutated
// inputs, not a separate engine (§C.9).
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import type { FinancialResult } from '@agrisense/shared';
import { FieldModel } from '../models/field.model';
import { LedgerModel } from '../models/ledger.model';
import { ScenarioRunModel } from '../models/scenarioRun.model';
import { computeFinancials, type CostLineItemInput } from '../services/engines/financial.engine';

// Mirrors financial.tools.ts's own local loader (established repo convention — each tool/
// controller that needs the data tables defines its own small typed loader, not a shared one).
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../../../../data');

interface CropRulesFile {
  crops: Record<string, { base_yield_kg_per_ha: { value: number } }>;
}
interface CostsBdFile {
  farmgate_prices_bdt_per_kg: Record<string, { value: number }>;
}

function loadJson<T>(file: string): T {
  return JSON.parse(readFileSync(path.join(DATA_DIR, file), 'utf-8')) as T;
}
function loadCropRulesFile(): CropRulesFile {
  return loadJson<CropRulesFile>('crop_rules.json');
}
function loadCostsBdFile(): CostsBdFile {
  return loadJson<CostsBdFile>('costs_bd.json');
}

export const postScenarioSchema = z.object({
  label: z.string().min(1).default('scenario'),
  weatherAdj: z.number().positive().optional(),
  inputAdj: z.number().positive().optional(),
  farmgatePriceBdtPerKg: z.number().positive().optional(),
  /** e.g. 0.6 for "cut input spend by 40%" — scales every projected cost line. */
  costMultiplier: z.number().positive().optional(),
});

function headline(r: FinancialResult) {
  return {
    totalCost: r.totalCost,
    expectedYieldKg: r.expectedYieldKg,
    grossRevenue: r.grossRevenue,
    netProfit: r.netProfit,
    roi: r.roi,
    bcr: r.bcr,
    breakEvenYieldKg: r.breakEvenYieldKg,
    breakEvenPrice: r.breakEvenPrice,
  };
}

export async function postScenario(req: Request, res: Response, next: NextFunction) {
  const fieldId = req.params.id;
  if (!fieldId) {
    res.status(400).json({ error: 'field id is required' });
    return;
  }
  const overrides = req.body as z.infer<typeof postScenarioSchema>;

  try {
    const field = await FieldModel.getState(fieldId);
    const cycle = field.activeCycle;
    if (!cycle || !cycle.crop) {
      res.status(400).json({ error: 'no active crop cycle with a chosen crop — nothing to simulate yet.' });
      return;
    }
    const areaHa = field.identity.areaHa;
    if (areaHa == null) {
      res.status(400).json({ error: 'field has no area — resolve intake first.' });
      return;
    }

    const cropRules = loadCropRulesFile();
    const costsBd = loadCostsBdFile();
    const rule = cropRules.crops[cycle.crop];
    const farmgate = costsBd.farmgate_prices_bdt_per_kg[cycle.crop];
    if (!rule || !farmgate) {
      res.status(400).json({ error: `no crop_rules.json/costs_bd.json entry for crop "${cycle.crop}".` });
      return;
    }

    const projected = (await LedgerModel.listByCycle(cycle.id)).filter((l) => !l.isActual && l.kind === 'cost');
    const baseLineItems: CostLineItemInput[] = projected.map((l) => ({
      item: l.item,
      qty: l.qty,
      unit: l.unit,
      unitCost: l.unitCost,
      total: l.total,
      source: l.source,
      assumption: l.assumption,
    }));

    const baseInput = {
      cropCycleId: cycle.id,
      crop: cycle.crop,
      season: cycle.season ?? 'unknown',
      areaHa,
      baseYieldKgPerHa: rule.base_yield_kg_per_ha.value,
      farmgatePriceBdtPerKg: farmgate.value,
    };

    const baseline = computeFinancials({ ...baseInput, weatherAdj: 1, inputAdj: 1, costLineItems: baseLineItems });

    const scenarioLineItems = overrides.costMultiplier
      ? baseLineItems.map((l) => ({ ...l, total: Number((l.total * overrides.costMultiplier!).toFixed(2)) }))
      : baseLineItems;

    const scenario = computeFinancials({
      ...baseInput,
      farmgatePriceBdtPerKg: overrides.farmgatePriceBdtPerKg ?? baseInput.farmgatePriceBdtPerKg,
      weatherAdj: overrides.weatherAdj ?? 1,
      inputAdj: overrides.inputAdj ?? 1,
      costLineItems: scenarioLineItems,
    });

    const diff = {
      totalCost: scenario.totalCost - baseline.totalCost,
      expectedYieldKg: scenario.expectedYieldKg - baseline.expectedYieldKg,
      grossRevenue: scenario.grossRevenue - baseline.grossRevenue,
      netProfit: scenario.netProfit - baseline.netProfit,
      roi: scenario.roi - baseline.roi,
      bcr: scenario.bcr - baseline.bcr,
    };

    const run = await ScenarioRunModel.create(cycle.id, overrides.label, overrides, headline(scenario), diff);

    res.status(201).json({
      id: run.id,
      label: run.label,
      overrides,
      baseline: headline(baseline),
      scenario: headline(scenario),
      diff,
    });
  } catch (err) {
    next(err);
  }
}
