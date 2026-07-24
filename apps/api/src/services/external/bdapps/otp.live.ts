// external/bdapps/otp.live.ts — same interface, real HTTP (bdapps API guide §6). Toggle via
// OTP_MODE=live. Auth is the same legacy shared secret (applicationId + password) as CaaS.
// NOTE: bdapps whitelists by originating IP (E1303) — venue Wi-Fi will not be provisioned.
import type { OtpClient, OtpRequestResult, OtpVerifyResult } from './otp.interface';
import { env } from '../../../config/env';

function requireCredentials(): { applicationId: string; password: string } {
  if (!env.BDAPPS_APPLICATION_ID || !env.BDAPPS_PASSWORD) {
    throw new Error('BDAPPS_APPLICATION_ID / BDAPPS_PASSWORD are not set — OTP_MODE=live needs both (.env).');
  }
  return { applicationId: env.BDAPPS_APPLICATION_ID, password: env.BDAPPS_PASSWORD };
}

export class LiveOtpClient implements OtpClient {
  async requestOtp(subscriberId: string): Promise<OtpRequestResult> {
    const { applicationId, password } = requireCredentials();
    const res = await fetch(`${env.BDAPPS_BASE_URL}/subscription/otp/request`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ applicationId, password, subscriberId }),
    });
    const body = (await res.json()) as OtpRequestResult;
    return body;
  }

  async verifyOtp(referenceNo: string, otp: string): Promise<OtpVerifyResult> {
    const { applicationId, password } = requireCredentials();
    const res = await fetch(`${env.BDAPPS_BASE_URL}/subscription/otp/verify`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ applicationId, password, referenceNo, otp }),
    });
    const body = (await res.json()) as OtpVerifyResult;
    return body;
  }
}
