// external/bdapps/caas.simulated.ts — the DEFAULT client (§A.3). Models the contract, not a
// 200-stub: exact response shapes, real status codes, 300–600ms latency, injectable failure paths.
// No real money moves — this is CAAS_MODE=simulated, the sanctioned demo default.
//
// "Insufficient balance" is NOT a status this client invents on directDebit: the real bdapps
// flow is propose → approve → QUERY BALANCE → debit → receipt (§A.3) — the balance query is
// exactly the step that lets payment.controller.ts stop *before* attempting a debit it knows
// will fail. directDebit itself only models the two real codes that make sense at that point:
// success, or a malformed request.
import { randomInt } from 'node:crypto';
import { CAAS_STATUS } from '@agrisense/shared';
import type { CaasClient, BalanceResult, DebitResult, DebitInput } from './caas.interface';

const STARTING_BALANCE_BDT = 2500;

const accounts = new Map<string, number>();
/** Idempotency: replaying the same externalTrxId (a network retry) returns the original
 * result rather than debiting twice — matches the real API's idempotency-key contract. */
const debitsByExternalTrxId = new Map<string, DebitResult>();

function getBalance(subscriberId: string): number {
  if (!accounts.has(subscriberId)) accounts.set(subscriberId, STARTING_BALANCE_BDT);
  return accounts.get(subscriberId)!;
}

function generateId(prefix: string): string {
  let digits = '';
  for (let i = 0; i < 12; i++) digits += randomInt(0, 10).toString();
  return `${prefix}${digits}`;
}

function latency(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 300 + randomInt(0, 300)));
}

export class SimulatedCaasClient implements CaasClient {
  async queryBalance(subscriberId: string): Promise<BalanceResult> {
    await latency();
    return {
      accountType: 'Prepaid',
      accountStatus: 'Active',
      chargeableBalance: getBalance(subscriberId),
      statusCode: CAAS_STATUS.SUCCESS,
      statusDetail: 'Success',
    };
  }

  async directDebit(input: DebitInput): Promise<DebitResult> {
    const existing = debitsByExternalTrxId.get(input.externalTrxId);
    if (existing) return existing; // idempotent replay — real network retries must not double-debit

    await latency();
    const amount = Number(input.amount);
    const timeStamp = new Date().toISOString();

    let result: DebitResult;
    if (!input.subscriberId || !Number.isFinite(amount) || amount <= 0) {
      result = {
        externalTrxId: input.externalTrxId,
        internalTrxId: '',
        referenceId: '',
        timeStamp,
        statusCode: CAAS_STATUS.INVALID_REQUEST,
        statusDetail: 'Missing / malformed mandatory field',
      };
    } else {
      const balance = getBalance(input.subscriberId);
      accounts.set(input.subscriberId, balance - amount); // simulated ledger moves even if it goes negative — payment.controller.ts is the real gate
      result = {
        externalTrxId: input.externalTrxId,
        internalTrxId: generateId('INT'),
        referenceId: generateId('REF'),
        timeStamp,
        statusCode: CAAS_STATUS.SUCCESS,
        statusDetail: 'Success',
      };
    }

    debitsByExternalTrxId.set(input.externalTrxId, result);
    return result;
  }
}
