// V — receipt serializer: a settled transaction row → the Receipt view (§A.3).
import type { TransactionRow } from '../models/transaction.model';

export function serializeReceipt(txn: TransactionRow) {
  // TODO: internalTrxId, referenceId, amount, timestamp, status — plus raw response payload.
  return txn;
}
