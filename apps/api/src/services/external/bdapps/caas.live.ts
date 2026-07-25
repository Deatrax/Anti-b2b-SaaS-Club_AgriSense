// external/bdapps/caas.live.ts — same interface, real HTTP (§A.3, bdapps API Guide §5).
// Toggle via CAAS_MODE=live. Auth is the same legacy shared secret (applicationId + password)
// as OTP. Endpoint paths + body/response shapes verified against Docs/bdapps-API-DGD v1.1.3.pdf
// §5.1 (Query Balance) and §5.3 (Direct Debit) — not guessed.
// NOTE: bdapps whitelists by originating IP (E1303) — venue Wi-Fi will not be provisioned.
import type { CaasClient, BalanceResult, DebitResult, DebitInput } from './caas.interface';
import { env } from '../../../config/env';

const PAYMENT_INSTRUMENT_NAME = 'Mobile Account'; // mandatory per API guide §5.1.1/§5.3.1 sample

function requireCredentials(): { applicationId: string; password: string } {
  if (!env.BDAPPS_APPLICATION_ID || !env.BDAPPS_PASSWORD) {
    throw new Error('BDAPPS_APPLICATION_ID / BDAPPS_PASSWORD are not set — CAAS_MODE=live needs both (.env).');
  }
  return { applicationId: env.BDAPPS_APPLICATION_ID, password: env.BDAPPS_PASSWORD };
}

interface RawBalanceResponse {
  accountType: string;
  accountStatus: string;
  statusCode: string;
  statusDetail: string;
  chargeableBalance: string; // API guide §5.1.2: string, rounded to 2 decimals
}

interface RawDebitResponse {
  externalTrxId: string;
  internalTrxId: string;
  referenceId?: string;
  timeStamp: string;
  statusCode: string;
  statusDetail: string;
}

export class LiveCaasClient implements CaasClient {
  async queryBalance(subscriberId: string): Promise<BalanceResult> {
    const { applicationId, password } = requireCredentials();
    const res = await fetch(`${env.BDAPPS_BASE_URL}/caas/balance/query`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        applicationId,
        password,
        subscriberId,
        currency: 'BDT',
        paymentInstrumentName: PAYMENT_INSTRUMENT_NAME,
      }),
    });
    const body = (await res.json()) as RawBalanceResponse;
    return {
      accountType: body.accountType,
      accountStatus: body.accountStatus,
      chargeableBalance: Number(body.chargeableBalance),
      statusCode: body.statusCode as BalanceResult['statusCode'],
      statusDetail: body.statusDetail,
    };
  }

  async directDebit(input: DebitInput): Promise<DebitResult> {
    const { applicationId, password } = requireCredentials();
    const res = await fetch(`${env.BDAPPS_BASE_URL}/caas/direct/debit`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        applicationId,
        password,
        externalTrxId: input.externalTrxId,
        subscriberId: input.subscriberId,
        amount: input.amount,
        currency: input.currency,
        paymentInstrumentName: PAYMENT_INSTRUMENT_NAME,
      }),
    });
    const body = (await res.json()) as RawDebitResponse;
    return {
      externalTrxId: body.externalTrxId,
      internalTrxId: body.internalTrxId,
      referenceId: body.referenceId ?? '', // optional per API guide §5.3.2
      timeStamp: body.timeStamp,
      statusCode: body.statusCode as DebitResult['statusCode'],
      statusDetail: body.statusDetail,
    };
  }
}
