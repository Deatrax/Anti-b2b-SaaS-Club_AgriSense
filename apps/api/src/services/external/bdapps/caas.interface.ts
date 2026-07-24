// external/bdapps/caas.interface.ts — the CaaS contract (§A.3). Simulated + Live both implement it.
// Payment tools depend on THIS interface; CAAS_MODE selects the implementation.
import type { CaasStatusCode } from '@agrisense/shared';

export interface BalanceResult {
  accountType: string; // Prepaid | Postpaid
  accountStatus: string;
  chargeableBalance: number;
  statusCode: CaasStatusCode;
  statusDetail: string;
}

export interface DebitResult {
  externalTrxId: string;
  internalTrxId: string;
  referenceId: string;
  timeStamp: string;
  statusCode: CaasStatusCode;
  statusDetail: string;
}

export interface DebitInput {
  externalTrxId: string; // idempotency key
  subscriberId: string; // "tel:8801XXXXXXXXX"
  amount: string;
  currency: string; // "BDT"
}

export interface CaasClient {
  queryBalance(subscriberId: string): Promise<BalanceResult>;
  directDebit(input: DebitInput): Promise<DebitResult>;
}
