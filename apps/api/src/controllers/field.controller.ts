// C — fields. Read the workspace state; the dashboard cards render from this.
import type { Request, Response, NextFunction } from 'express';
import { FieldModel } from '../models/field.model';
import { PlanEventModel } from '../models/planEvent.model';
import { SeasonPlanModel } from '../models/seasonPlan.model';
import { LedgerModel } from '../models/ledger.model';
import { serializeField } from '../views/field.view';
import { serializePlan } from '../views/plan.view';
import { serializeFinancial } from '../views/financial.view';

function isNotFound(err: unknown): err is Error {
  return err instanceof Error && err.message.includes('not found');
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
      res.json({ plan: null, financial: serializeFinancial([]) });
      return;
    }
    const [events, meta, ledgerEntries] = await Promise.all([
      PlanEventModel.listByCycle(cycle.id),
      SeasonPlanModel.getLatestForCycle(cycle.id),
      LedgerModel.listByCycle(cycle.id),
    ]);
    const plan = meta ? { ...meta, events } : null;
    res.json({
      plan: serializePlan(plan),
      financial: serializeFinancial(ledgerEntries),
    });
  } catch (err) {
    if (isNotFound(err)) {
      res.status(404).json({ error: err.message });
      return;
    }
    next(err);
  }
}
