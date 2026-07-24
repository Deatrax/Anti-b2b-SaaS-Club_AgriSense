// C — auth. Phone as a plain identifier, NO OTP (§A.3 "don't build OTP"). Thin: HTTP → service.
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { UserModel } from '../models/user.model';
import { FarmModel } from '../models/farm.model';

export const loginSchema = z.object({
  phone: z.string().min(1),
  name: z.string().optional(),
  lang: z.string().optional(),
});

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { phone, name, lang } = req.body as z.infer<typeof loginSchema>;
    const user = (await UserModel.findByPhone(phone)) ?? (await UserModel.create(phone, name, lang));
    const farms = await FarmModel.listByUser(user.id);
    res.json({ user, farms });
  } catch (err) {
    next(err);
  }
}
