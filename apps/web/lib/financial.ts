// lib/financial.ts — GET /fields/:id/plan only returns raw projected/actual ledger lines
// (financial.view.ts's serializeFinancial never computed a headline — that stayed inside
// financial.engine.ts, server-side only). This derives the same headline figures
// (total cost, revenue, net profit, ROI, BCR, break-even) client-side via the identical
// formulas, from the real stored line items — never an invented number, just re-summing
// what the API already returned.
import type { ApiFinancial, ApiLedgerLine } from './api';

export interface FinancialHeadline {
  totalCost: number;
  grossRevenue: number;
  netProfit: number;
  roi: number | null;
  bcr: number | null;
  expectedYieldKg: number | null;
  breakEvenYieldKg: number | null;
  breakEvenPrice: number | null;
}

export function computeHeadline(financial: ApiFinancial): FinancialHeadline {
  const lines: ApiLedgerLine[] = [...financial.actual, ...financial.projected];
  const totalCost = lines.filter((l) => l.kind === 'cost').reduce((s, l) => s + l.total, 0);
  const grossRevenue = lines.filter((l) => l.kind === 'revenue').reduce((s, l) => s + l.total, 0);
  const netProfit = grossRevenue - totalCost;

  // The revenue line financial.engine.ts writes carries qty = expectedYieldKg and
  // unitCost = farmgatePriceBdtPerKg — real values, not re-derived from anywhere else.
  const revenueLine = lines.find((l) => l.kind === 'revenue' && l.qty != null && l.unitCost != null);
  const expectedYieldKg = revenueLine?.qty ?? null;
  const farmgatePrice = revenueLine?.unitCost ?? null;

  return {
    totalCost,
    grossRevenue,
    netProfit,
    roi: totalCost > 0 ? netProfit / totalCost : null,
    bcr: totalCost > 0 ? grossRevenue / totalCost : null,
    expectedYieldKg,
    breakEvenYieldKg: farmgatePrice ? totalCost / farmgatePrice : null,
    breakEvenPrice: expectedYieldKg ? totalCost / expectedYieldKg : null,
  };
}
