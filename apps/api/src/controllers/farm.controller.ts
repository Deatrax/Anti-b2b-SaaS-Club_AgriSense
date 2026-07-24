// C — farms. List/create a farm (auto-named), list its fields.
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { FarmModel } from '../models/farm.model';
import { FieldModel } from '../models/field.model';
import { UserModel } from '../models/user.model';
import { ConversationModel } from '../models/conversation.model';
import { serializeField } from '../views/field.view';

export async function listFarms(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.query.userId;
    if (typeof userId !== 'string' || !userId) {
      res.status(400).json({ error: 'userId query param is required' });
      return;
    }
    const farms = await FarmModel.listByUser(userId);
    res.json({ farms });
  } catch (err) {
    next(err);
  }
}

export const createFarmSchema = z.object({
  userId: z.string().min(1),
  name: z.string().min(1),
  district: z.string().min(1),
  /** Onboarding also collects the farmer's own name here — OTP verify creates the user
   * before that's known (§ auth.controller.ts), so this is the first real chance to set it. */
  userName: z.string().min(1).optional(),
});

export async function createFarm(req: Request, res: Response, next: NextFunction) {
  const { userId, name, district, userName } = req.body as z.infer<typeof createFarmSchema>;
  try {
    const user = userName ? await UserModel.update(userId, { name: userName }) : await UserModel.get(userId);
    const farm = await FarmModel.create(userId, { name, district });
    res.status(201).json({ farm, user });
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('unknown district')) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
}

export async function listFields(req: Request, res: Response, next: NextFunction) {
  const farmId = req.params.id;
  if (!farmId) {
    res.status(400).json({ error: 'farm id is required' });
    return;
  }
  try {
    const states = await FieldModel.listByFarm(farmId);
    res.json({ fields: states.map(serializeField) });
  } catch (err) {
    next(err);
  }
}

/** "Recent chats" for the sidebar — every conversation across the farm's fields (§ multi-chat:
 * a field can have several), newest last-message first. */
export async function listRecentChats(req: Request, res: Response, next: NextFunction) {
  const farmId = req.params.id;
  if (!farmId) {
    res.status(400).json({ error: 'farm id is required' });
    return;
  }
  const limit = Math.max(1, Number(req.query.limit) || 5);
  const offset = Math.max(0, Number(req.query.offset) || 0);
  try {
    const { chats, total } = await ConversationModel.listRecentForFarm(farmId, limit, offset);
    res.json({ chats, total });
  } catch (err) {
    next(err);
  }
}
