// C — farmer edits (irrigation/fertilizer/observation). A write here triggers a scoped
// replan — the differentiator (§A.2, §C.8 replan trigger).
import type { Request, Response } from 'express';

export async function postLog(req: Request, res: Response) {
  // TODO: FieldLogModel.add → replan/trigger.onFieldWrite(fieldId, kind, payload) → return diff.
  res.status(501).json({ error: 'not implemented' });
}
