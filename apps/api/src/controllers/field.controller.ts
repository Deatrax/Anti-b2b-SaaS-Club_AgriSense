// C — fields. Read the workspace state; the dashboard cards render from this.
import type { Request, Response } from 'express';

export async function getField(req: Request, res: Response) {
  // TODO: FieldModel.getState(req.params.id) → serializeField.
  res.status(501).json({ error: 'not implemented' });
}

export async function getFieldPlan(req: Request, res: Response) {
  // TODO: PlanEventModel.listByCycle + LedgerModel.listByCycle → plan/financial views.
  res.status(501).json({ error: 'not implemented' });
}
