// lib/mock-financials.ts — pure, parametrized re-run of the financial engine for the
// /mock/field/money screen's live area-stepper + urea-price override. Scales
// ledgerEntries/financials from lib/mock-data.ts (never the standalone HTML mock's own
// placeholder RATES table) so every figure stays internally consistent with the rest of
// the app. Land-rent (l-11) is held fixed, same convention scenarioFinancials() already
// uses for a cash-budget cut — here the fixed line doesn't scale with area either.
import type { FinancialResult, LedgerEntry } from '@agrisense/shared';
import { fieldState, financials, ledgerEntries } from './mock-data';

const FIXED_ITEM_IDS = new Set(['l-11']);
const UREA_ITEM_ID = 'l-3';

export interface MoneyOverrides {
  ureaUnitCostBdt?: number;
}

export function computeFieldFinancials(areaHa: number, overrides: MoneyOverrides = {}): FinancialResult {
  const baseAreaHa = fieldState.identity.areaHa ?? 0.5;
  const areaFactor = baseAreaHa > 0 ? areaHa / baseAreaHa : 1;

  const lineItems: LedgerEntry[] = ledgerEntries.map((l) => {
    if (FIXED_ITEM_IDS.has(l.id)) return l;

    if (l.id === UREA_ITEM_ID && overrides.ureaUnitCostBdt != null && l.qty != null) {
      const scaledQty = Math.round(l.qty * areaFactor);
      return { ...l, qty: scaledQty, unitCost: overrides.ureaUnitCostBdt, total: Math.round(scaledQty * overrides.ureaUnitCostBdt) };
    }

    return { ...l, total: Math.round(l.total * areaFactor) };
  });

  const totalCost = lineItems.filter((l) => l.kind === 'cost').reduce((s, l) => s + l.total, 0);
  const grossRevenue = lineItems.filter((l) => l.kind === 'revenue').reduce((s, l) => s + l.total, 0);
  const expectedYieldKg = Math.round(financials.expectedYieldKg * areaFactor);
  const netProfit = grossRevenue - totalCost;

  return {
    lineItems,
    totalCost,
    expectedYieldKg,
    grossRevenue,
    netProfit,
    roi: totalCost > 0 ? netProfit / totalCost : 0,
    bcr: totalCost > 0 ? grossRevenue / totalCost : 0,
    breakEvenYieldKg: totalCost / 28,
    breakEvenPrice: expectedYieldKg > 0 ? totalCost / expectedYieldKg : 0,
  };
}

export function ureaLineItem(lineItems: LedgerEntry[]): LedgerEntry | undefined {
  return lineItems.find((l) => l.id === UREA_ITEM_ID);
}

export const ORIGINAL_UREA_UNIT_COST_BDT = ledgerEntries.find((l) => l.id === UREA_ITEM_ID)?.unitCost ?? 27;
