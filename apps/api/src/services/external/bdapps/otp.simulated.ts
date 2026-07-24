// external/bdapps/otp.simulated.ts — the DEFAULT client. Models the real contract (bdapps API
// guide §6), not a 200-stub: real status codes (S1000/E1850/E1851/E1852), a real 5-minute
// expiry, a real attempt cap, one-time-use referenceNo. No SMS provider is wired in demo mode,
// so the generated code is logged to the server console instead — clearly labeled, never
// silently swallowed, matching this repo's "no invented numbers, no hidden fallback" rule.
import { randomInt } from 'node:crypto';
import { OTP_STATUS } from '@agrisense/shared';
import type { OtpClient, OtpRequestResult, OtpVerifyResult } from './otp.interface';

const OTP_TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;

interface PendingOtp {
  subscriberId: string;
  code: string;
  expiresAt: number;
  attempts: number;
}

const pending = new Map<string, PendingOtp>();

function generateReferenceNo(): string {
  // 15 digits, matching the API guide's referenceNo length/format.
  let ref = '';
  for (let i = 0; i < 15; i++) ref += randomInt(0, 10).toString();
  return ref;
}

function generateCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}

export class SimulatedOtpClient implements OtpClient {
  async requestOtp(subscriberId: string): Promise<OtpRequestResult> {
    const referenceNo = generateReferenceNo();
    const code = generateCode();
    pending.set(referenceNo, { subscriberId, code, expiresAt: Date.now() + OTP_TTL_MS, attempts: 0 });

    // eslint-disable-next-line no-console
    console.log(`[SIMULATED OTP] ${subscriberId} → code ${code} (referenceNo ${referenceNo}, expires in 5m)`);

    return { statusCode: OTP_STATUS.SUCCESS, statusDetail: 'Success', referenceNo };
  }

  async verifyOtp(referenceNo: string, otp: string): Promise<OtpVerifyResult> {
    const entry = pending.get(referenceNo);
    if (!entry) {
      return { statusCode: OTP_STATUS.OTP_EXPIRED, statusDetail: 'OTP request has expired', subscriberId: null };
    }
    if (Date.now() > entry.expiresAt) {
      pending.delete(referenceNo);
      return { statusCode: OTP_STATUS.OTP_EXPIRED, statusDetail: 'OTP request has expired', subscriberId: null };
    }
    if (entry.attempts >= MAX_ATTEMPTS) {
      pending.delete(referenceNo);
      return { statusCode: OTP_STATUS.MAX_ATTEMPTS, statusDetail: 'Maximum number of OTP attempts reached', subscriberId: null };
    }
    if (entry.code !== otp) {
      entry.attempts += 1;
      return { statusCode: OTP_STATUS.INVALID_OTP, statusDetail: 'Invalid OTP', subscriberId: null };
    }

    pending.delete(referenceNo); // one-time use
    return { statusCode: OTP_STATUS.SUCCESS, statusDetail: 'Success', subscriberId: entry.subscriberId };
  }
}
