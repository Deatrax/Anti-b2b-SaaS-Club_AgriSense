// lib/format.ts — BDT + date + area formatting for the UI.
export function bdt(n: number): string {
  return `৳${Math.round(n).toLocaleString('en-BD')}`;
}
// TODO: date, area (ha↔bigha), percentage helpers.
