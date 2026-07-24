// lib/format.ts — BDT + date + area formatting for the UI.
export function bdt(n: number): string {
  return `৳${Math.round(n).toLocaleString('en-BD')}`;
}

export function percent(n: number, fractionDigits = 0): string {
  return `${(n * 100).toFixed(fractionDigits)}%`;
}

export function shortDate(iso: string, lang: 'en' | 'bn' = 'bn'): string {
  return new Date(iso).toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-BD', {
    day: 'numeric',
    month: 'short',
  });
}

export function daysUntil(iso: string, from = new Date('2026-07-24')): number {
  const target = new Date(iso);
  return Math.round((target.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

/** Same math as daysUntil, but against the real current date — for live-data pages. */
export function daysFromToday(iso: string): number {
  return daysUntil(iso, new Date());
}
