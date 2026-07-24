// C — farms. List/create a farm (auto-named), list its fields.
import type { Request, Response } from 'express';

export async function listFarms(req: Request, res: Response) {
  // TODO: FarmModel.listByUser(req.query.userId).
  res.status(501).json({ error: 'not implemented' });
}

export async function createFarm(req: Request, res: Response) {
  // TODO: FarmModel.create — resolve district → lat/lon/aez from data/districts.json.
  res.status(501).json({ error: 'not implemented' });
}
