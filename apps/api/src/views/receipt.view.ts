// V — receipt serializer: a settled transaction row → the Receipt view (§A.3).
import type { TransactionRow } from '../models/transaction.model';

export function serializeReceipt(txn: TransactionRow) {
  return {
    externalTrxId: txn.external_trx_id,
    internalTrxId: txn.internal_trx_id,
    referenceId: txn.reference_id,
    amountBdt: txn.amount_bdt,
    msisdn: txn.msisdn,
    status: txn.status,
    mode: txn.mode,
    approvedAt: txn.approved_at,
  };
}
