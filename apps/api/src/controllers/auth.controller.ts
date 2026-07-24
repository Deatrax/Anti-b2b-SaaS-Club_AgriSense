// C — auth. Real OTP via bdapps (API guide §6) — request → verify → upsert user by phone.
// Two-step: POST /auth/otp/request gets a referenceNo (real SMS in live mode, server-console
// log in simulated mode — see otp.simulated.ts); POST /auth/otp/verify checks the code and
// only then logs the farmer in. No password, no separate token — phone is still the identity,
// OTP just proves the farmer actually holds that number before we trust it.
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { OTP_STATUS } from '@agrisense/shared';
import { UserModel } from '../models/user.model';
import { FarmModel } from '../models/farm.model';
import { env } from '../config/env';
import { SimulatedOtpClient } from '../services/external/bdapps/otp.simulated';
import { LiveOtpClient } from '../services/external/bdapps/otp.live';
import type { OtpClient } from '../services/external/bdapps/otp.interface';

const otpClient: OtpClient = env.OTP_MODE === 'live' ? new LiveOtpClient() : new SimulatedOtpClient();

/** "018xxxxxxxx", "8801...", "+8801..." → bdapps subscriberId "tel:8801XXXXXXXXX" (local
 * number KEEPS its leading 0 — "tel:88" + "01712345678", matching the reference send_otp.php
 * exactly, not "tel:880" + national-number-without-0). Returns null if not a valid BD mobile. */
function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D+/g, '');
  let local = digits;
  if (local.startsWith('880') && local.length === 13) local = `0${local.slice(3)}`;
  else if (local.startsWith('88') && local.length === 12) local = `0${local.slice(2)}`;
  if (!/^01[3-9][0-9]{8}$/.test(local)) return null;
  return `tel:88${local}`;
}

export const requestOtpSchema = z.object({ phone: z.string().min(1) });

export async function requestOtp(req: Request, res: Response, next: NextFunction) {
  const { phone } = req.body as z.infer<typeof requestOtpSchema>;
  const subscriberId = normalizePhone(phone);
  if (!subscriberId) {
    res.status(400).json({ error: 'Enter a valid Bangladesh mobile number (e.g. 01712345678).' });
    return;
  }
  try {
    const result = await otpClient.requestOtp(subscriberId);
    if (result.statusCode !== OTP_STATUS.SUCCESS) {
      res.status(400).json({ error: result.statusDetail, statusCode: result.statusCode });
      return;
    }
    res.json({ referenceNo: result.referenceNo });
  } catch (err) {
    next(err);
  }
}

export const verifyOtpSchema = z.object({
  referenceNo: z.string().min(1),
  otp: z.string().min(1),
  name: z.string().optional(),
  lang: z.string().optional(),
});

export async function verifyOtp(req: Request, res: Response, next: NextFunction) {
  const { referenceNo, otp, name, lang } = req.body as z.infer<typeof verifyOtpSchema>;
  try {
    const result = await otpClient.verifyOtp(referenceNo, otp);
    if (result.statusCode !== OTP_STATUS.SUCCESS || !result.subscriberId) {
      res.status(400).json({ error: result.statusDetail, statusCode: result.statusCode });
      return;
    }
    // bdapps' own verify response is the source of truth for which phone just verified —
    // never trust a client-supplied phone at this step. subscriberId is "tel:88" + local
    // (local already has its own leading 0), so stripping the prefix recovers it exactly.
    const phone = result.subscriberId.replace(/^tel:88/, '');
    const user = (await UserModel.findByPhone(phone)) ?? (await UserModel.create(phone, name, lang));
    const farms = await FarmModel.listByUser(user.id);
    res.json({ user, farms });
  } catch (err) {
    next(err);
  }
}
