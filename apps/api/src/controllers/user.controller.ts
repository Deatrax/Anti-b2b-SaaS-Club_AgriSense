// C — account settings: update name/language, delete account. Phone is NOT editable here —
// it's the identity itself (§A.3); changing it would need a fresh OTP verification, out of
// scope for a settings-page edit.
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { UserModel } from '../models/user.model';

export const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  lang: z.enum(['en', 'bn']).optional(),
});

export async function updateUser(req: Request, res: Response, next: NextFunction) {
  const id = req.params.id;
  if (!id) {
    res.status(400).json({ error: 'user id is required' });
    return;
  }
  const patch = req.body as z.infer<typeof updateUserSchema>;
  try {
    const user = await UserModel.update(id, patch);
    res.json({ user });
  } catch (err) {
    if (err instanceof Error && err.message.includes('not found')) {
      res.status(404).json({ error: err.message });
      return;
    }
    next(err);
  }
}

export async function deleteUser(req: Request, res: Response, next: NextFunction) {
  const id = req.params.id;
  if (!id) {
    res.status(400).json({ error: 'user id is required' });
    return;
  }
  try {
    await UserModel.delete(id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
