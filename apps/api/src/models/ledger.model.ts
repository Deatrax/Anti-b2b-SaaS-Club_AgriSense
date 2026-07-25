// M — ledger. The projection is accountable to reality: NEVER overwrite is_actual = true rows.
import { query, withTransaction } from '../config/db';
import type { LedgerEntry, LedgerKind } from '@agrisense/shared';

interface LedgerRow {
  id: string;
  crop_cycle_id: string;
  kind: LedgerKind;
  item: string;
  qty: string | null;
  unit: string | null;
  unit_cost: string | null;
  total: string;
  source: string | null;
  assumption: string | null;
  is_actual: boolean;
  occurred_on: string | null;
  transaction_id: string | null;
}

function toLedgerEntry(r: LedgerRow): LedgerEntry {
  return {
    id: r.id,
    cropCycleId: r.crop_cycle_id,
    kind: r.kind,
    item: r.item,
    qty: r.qty != null ? Number(r.qty) : null,
    unit: r.unit,
    unitCost: r.unit_cost != null ? Number(r.unit_cost) : null,
    total: Number(r.total),
    source: r.source,
    assumption: r.assumption,
    isActual: r.is_actual,
    occurredOn: r.occurred_on,
    transactionId: r.transaction_id,
  };
}

export const LedgerModel = {
  async listByCycle(cropCycleId: string): Promise<LedgerEntry[]> {
    const rows = await query<LedgerRow>('select * from ledger_entries where crop_cycle_id = $1', [cropCycleId]);
    return rows.map(toLedgerEntry);
  },

  /** Replaces the compute_financials projection atomically — never touches is_actual = true rows. */
  async replaceProjection(cropCycleId: string, entries: LedgerEntry[]): Promise<void> {
    await withTransaction(async (client) => {
      await client.query('delete from ledger_entries where crop_cycle_id = $1 and is_actual = false', [
        cropCycleId,
      ]);
      for (const e of entries) {
        await client.query(
          `insert into ledger_entries
             (crop_cycle_id, kind, item, qty, unit, unit_cost, total, source, assumption, is_actual, occurred_on)
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9,false,$10)`,
          [cropCycleId, e.kind, e.item, e.qty, e.unit, e.unitCost, e.total, e.source, e.assumption, e.occurredOn],
        );
      }
    });
  },

  /** A posted bdapps charge — projected → actual (§A.3). Additive; never deletes/overwrites. */
  async postActual(cropCycleId: string, entry: LedgerEntry): Promise<void> {
    await query(
      `insert into ledger_entries
         (crop_cycle_id, kind, item, qty, unit, unit_cost, total, source, assumption, is_actual, occurred_on, transaction_id)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,true,$10,$11)`,
      [
        cropCycleId,
        entry.kind,
        entry.item,
        entry.qty,
        entry.unit,
        entry.unitCost,
        entry.total,
        entry.source,
        entry.assumption,
        entry.occurredOn,
        entry.transactionId,
      ],
    );
  },
};
