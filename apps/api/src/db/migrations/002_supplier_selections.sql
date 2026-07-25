-- 002_supplier_selections.sql — marketplace supplier choice per plan item, durable across
-- compute_financials rebuilds. financial.tools.ts's cost-line builder reads this table (see
-- Docs/superpowers/specs/2026-07-25-marketplace-supplier-comparison-design.md) instead of a
-- price written directly onto a ledger_entries row, because LedgerModel.replaceProjection()
-- deletes and reinserts every non-actual row on every compute_financials call and would
-- otherwise silently wipe it.
-- Run: npm run migrate (apps/api/src/db/migrate.ts applies every migrations/*.sql in order).

create table if not exists supplier_selections (
  id uuid primary key default gen_random_uuid(),
  crop_cycle_id uuid references crop_cycles(id) on delete cascade,
  item_key text not null,                        -- urea|tsp|mop|gypsum|seed
  supplier_id text not null,
  supplier_name text not null,
  unit_price_bdt numeric not null,
  delivery_days int not null,
  selected_at timestamptz default now(),
  unique (crop_cycle_id, item_key)
);
