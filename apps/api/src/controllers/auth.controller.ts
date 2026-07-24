// C — auth. Phone as a plain identifier, NO OTP (§A.3 "don't build OTP"). Thin: HTTP → service.
import type { Request, Response } from 'express';

export async function login(req: Request, res: Response) {
  // TODO: upsert user by phone (UserModel), return user + farms. No password, no token flow.
  res.status(501).json({ error: 'not implemented' });
}
