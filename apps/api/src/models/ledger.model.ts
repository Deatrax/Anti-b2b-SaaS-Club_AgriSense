// M — ledger. The projection is accountable to reality: NEVER overwrite is_actual = true rows.
import { query } from '../config/db';
import type { LedgerEntry } from '@agrisense/shared';

export const LedgerModel = {
  async listByCycle(cropCycleId: string): Promise<LedgerEntry[]> {
    return query<LedgerEntry>('select * from ledger_entries where crop_cycle_id = $1', [cropCycleId]);
  },

  async replaceProjection(cropCycleId: string, entries: LedgerEntry[]): Promise<void> {
    // TODO: delete only is_actual = false rows, then insert `entries` (compute_financials output).
    void cropCycleId;
    void entries;
  },

  async postActual(cropCycleId: string, entry: LedgerEntry): Promise<void> {
    // TODO: insert an is_actual = true row (a posted bdapps charge) — projected → actual (§A.3).
    void cropCycleId;
    void entry;
  },
};
