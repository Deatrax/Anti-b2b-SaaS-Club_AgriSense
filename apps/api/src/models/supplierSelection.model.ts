// M — supplier_selections. Durable record of which mock supplier the farmer picked per plan
// item — consulted by financial.tools.ts on every compute_financials rebuild (§ migration
// 002's header comment: a price written directly onto a ledger row would otherwise be wiped
// by LedgerModel.replaceProjection()).
import { query } from '../config/db';

/** unit_price_bdt/delivery_days are a SNAPSHOT of the catalog offer at selection time, by
 * design — matches how a real order locks in a quoted price. If data/suppliers.json changes
 * or the offer goes out of stock afterward, this row (and financial.tools.ts's use of it)
 * keeps the originally-selected price rather than silently re-pricing an already-chosen item. */
export interface SupplierSelectionRow {
  id: string;
  crop_cycle_id: string;
  item_key: string;
  supplier_id: string;
  supplier_name: string;
  unit_price_bdt: number;
  delivery_days: number;
  selected_at: string;
}

interface SupplierSelectionRawRow extends Omit<SupplierSelectionRow, 'unit_price_bdt'> {
  unit_price_bdt: string; // numeric column — raw from pg
}

function toRow(r: SupplierSelectionRawRow): SupplierSelectionRow {
  return { ...r, unit_price_bdt: Number(r.unit_price_bdt) };
}

export const SupplierSelectionModel = {
  async listByCycle(cropCycleId: string): Promise<SupplierSelectionRow[]> {
    const rows = await query<SupplierSelectionRawRow>(
      'select * from supplier_selections where crop_cycle_id = $1',
      [cropCycleId],
    );
    return rows.map(toRow);
  },

  /** One selection per (cycle, item) — picking a new supplier for an already-chosen item
   * replaces it rather than accumulating history. */
  async upsert(
    cropCycleId: string,
    itemKey: string,
    selection: { supplierId: string; supplierName: string; unitPriceBdt: number; deliveryDays: number },
  ): Promise<SupplierSelectionRow> {
    const [row] = await query<SupplierSelectionRawRow>(
      `insert into supplier_selections (crop_cycle_id, item_key, supplier_id, supplier_name, unit_price_bdt, delivery_days)
       values ($1,$2,$3,$4,$5,$6)
       on conflict (crop_cycle_id, item_key) do update set
         supplier_id = excluded.supplier_id,
         supplier_name = excluded.supplier_name,
         unit_price_bdt = excluded.unit_price_bdt,
         delivery_days = excluded.delivery_days,
         selected_at = now()
       returning *`,
      [cropCycleId, itemKey, selection.supplierId, selection.supplierName, selection.unitPriceBdt, selection.deliveryDays],
    );
    return toRow(row!);
  },
};
