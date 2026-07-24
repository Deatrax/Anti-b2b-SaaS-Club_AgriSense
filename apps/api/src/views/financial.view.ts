// V — financial serializer: LedgerEntry rows → the Money card (projected vs actual).
// No computed headline (roi/bcr/break-even) yet — that's financial.engine.ts (Phase 4).
// Only real, stored line items are shown; nothing here is invented (§0 Prime Directive).
import type { LedgerEntry } from '@agrisense/shared';

function toLine(e: LedgerEntry) {
  return {
    id: e.id,
    kind: e.kind,
    item: e.item,
    qty: e.qty,
    unit: e.unit,
    unitCost: e.unitCost,
    total: e.total,
    source: e.source,
    assumption: e.assumption,
    occurredOn: e.occurredOn,
  };
}

export function serializeFinancial(entries: LedgerEntry[]) {
  return {
    projected: entries.filter((e) => !e.isActual).map(toLine),
    actual: entries.filter((e) => e.isActual).map(toLine),
  };
}
