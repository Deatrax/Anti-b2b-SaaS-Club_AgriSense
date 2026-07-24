// external/bdapps/otp.interface.ts — the OTP contract (bdapps API guide §6). Simulated + Live
// both implement it. auth.controller.ts depends on THIS interface; OTP_MODE selects the impl.
import type { OtpStatusCode } from '@agrisense/shared';

export interface OtpRequestResult {
  statusCode: OtpStatusCode;
  statusDetail: string;
  referenceNo: string;
}

export interface OtpVerifyResult {
  statusCode: OtpStatusCode;
  statusDetail: string;
  /** "tel:8801XXXXXXXXX" — bdapps returns this on successful verify; it's the source of
   * truth for which phone just verified (never trust a client-supplied phone at verify time). */
  subscriberId: string | null;
}

export interface OtpClient {
  requestOtp(subscriberId: string): Promise<OtpRequestResult>;
  verifyOtp(referenceNo: string, otp: string): Promise<OtpVerifyResult>;
}
