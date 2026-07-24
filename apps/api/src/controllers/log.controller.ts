// C — farmer edits (irrigation/fertilizer/observation). A write here triggers a scoped
// replan — the differentiator (§A.2, §C.8 replan trigger).
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { FieldModel } from '../models/field.model';
import { FieldLogModel } from '../models/fieldLog.model';
import { onFieldWrite } from '../services/replan/trigger.service';

export const postLogSchema = z.object({
  kind: z.enum(['irrigation', 'fertilizer', 'pest', 'observation']),
  description: z.string().optional(),
  quantity: z.number().optional(),
  unit: z.string().optional(),
});

export async function postLog(req: Request, res: Response, next: NextFunction) {
  const fieldId = req.params.id;
  if (!fieldId) {
    res.status(400).json({ error: 'field id is required' });
    return;
  }
  const { kind, description, quantity, unit } = req.body as z.infer<typeof postLogSchema>;
  try {
    const field = await FieldModel.getState(fieldId);
    const log = await FieldLogModel.add(fieldId, kind, { description, quantity, unit }, field.activeCycle?.id);
    const diff = await onFieldWrite(fieldId, kind, { description, quantity, unit });
    res.status(201).json({ log, diff });
  } catch (err) {
    if (err instanceof Error && err.message.includes('not found')) {
      res.status(404).json({ error: err.message });
      return;
    }
    next(err);
  }
}
