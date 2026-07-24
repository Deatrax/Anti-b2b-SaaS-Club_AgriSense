// V — financial serializer: FinancialResult → the Money card (headline + itemized ledger).
import type { FinancialResult } from '@agrisense/shared';

export function serializeFinancial(result: FinancialResult) {
  // TODO: split projected vs actual; expose per-line source + assumption for the Why panel.
  return result;
}
