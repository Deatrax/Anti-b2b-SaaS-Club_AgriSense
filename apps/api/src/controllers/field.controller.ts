// C — fields. Read the workspace state; the dashboard cards render from this.
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { FieldModel } from '../models/field.model';
import { PlanEventModel } from '../models/planEvent.model';
import { SeasonPlanModel } from '../models/seasonPlan.model';
import { LedgerModel } from '../models/ledger.model';
import { RiskWindowModel } from '../models/riskWindow.model';
import { serializeField } from '../views/field.view';
import { serializePlan } from '../views/plan.view';
import { serializeFinancial } from '../views/financial.view';

function isNotFound(err: unknown): err is Error {
  return err instanceof Error && err.message.includes('not found');
}

export const createFieldSchema = z.object({
  farmId: z.string().min(1),
  name: z.string().min(1).optional(),
});

export async function createField(req: Request, res: Response, next: NextFunction) {
  const { farmId, name } = req.body as z.infer<typeof createFieldSchema>;
  try {
    const identity = await FieldModel.create(farmId, name);
    res.status(201).json({ field: identity });
  } catch (err) {
    next(err);
  }
}

export async function getField(req: Request, res: Response, next: NextFunction) {
  const id = req.params.id;
  if (!id) {
    res.status(400).json({ error: 'field id is required' });
    return;
  }
  try {
    const state = await FieldModel.getState(id);
    res.json(serializeField(state));
  } catch (err) {
    if (isNotFound(err)) {
      res.status(404).json({ error: err.message });
      return;
    }
    next(err);
  }
}

export async function getFieldPlan(req: Request, res: Response, next: NextFunction) {
  const id = req.params.id;
  if (!id) {
    res.status(400).json({ error: 'field id is required' });
    return;
  }
  try {
    const state = await FieldModel.getState(id);
    const cycle = state.activeCycle;
    if (!cycle) {
      res.json({ plan: null, financial: serializeFinancial([]), risk: [] });
      return;
    }
    const [events, meta, ledgerEntries, riskWindows] = await Promise.all([
      PlanEventModel.listByCycle(cycle.id),
      SeasonPlanModel.getLatestForCycle(cycle.id),
      LedgerModel.listByCycle(cycle.id),
      RiskWindowModel.listByCycle(cycle.id),
    ]);
    const plan = meta ? { ...meta, events } : null;
    res.json({
      plan: serializePlan(plan),
      financial: serializeFinancial(ledgerEntries),
      risk: riskWindows,
    });
  } catch (err) {
    if (isNotFound(err)) {
      res.status(404).json({ error: err.message });
      return;
    }
    next(err);
  }
}
