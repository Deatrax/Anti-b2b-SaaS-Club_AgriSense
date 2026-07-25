// Financial ledger + the financial-engine result (§C.9). The projection is accountable
// to reality via is_actual (a posted bdapps charge flips projected → actual).

export type LedgerKind = 'cost' | 'revenue';

export interface LedgerEntry {
  id: string;
  cropCycleId: string;
  kind: LedgerKind;
  item: string;
  qty: number | null;
  unit: string | null;
  unitCost: number | null;
  total: number;
  /** Provenance string rendered in the trace (e.g. "costs_bd.json → urea @ ৳27/kg"). */
  source: string | null;
  /** Human-readable assumption behind the line, shown in <WhyPanel>. */
  assumption: string | null;
  isActual: boolean;
  occurredOn: string | null;
  transactionId: string | null;
}

/** Output of financial.engine (§C.9) — PURE, deterministic, unit-tested. */
export interface FinancialResult {
  lineItems: LedgerEntry[];
  totalCost: number;
  expectedYieldKg: number;
  grossRevenue: number;
  netProfit: number;
  /** net_profit / total_cost */
  roi: number;
  /** gross_revenue / total_cost — Boro HYV sanity anchor ≈ 1.9–2.3 (§C.9) */
  bcr: number;
  /** total_cost / farmgate_price */
  breakEvenYieldKg: number;
  /** total_cost / expected_yield */
  breakEvenPrice: number;
}

/** Tier-1 scenario simulation (§A.1 gap) — reuses the financial engine, renders a diff. */
export interface ScenarioRun {
  id: string;
  cropCycleId: string;
  label: string;
  constraintJson: unknown;
  overrides: unknown;
  result: unknown;
  diff: unknown;
  createdAt: string;
}
