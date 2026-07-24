// lib/i18n.ts — minimal bn/en dictionary lookup (§B.5 Bengali-first).
import en from '../locales/en.json';
import bn from '../locales/bn.json';

export type Lang = 'en' | 'bn';

const dict: Record<Lang, Record<string, string>> = { en, bn };

export function t(key: string, lang: Lang = 'bn'): string {
  return dict[lang]?.[key] ?? key;
}

/** t() with `{var}` interpolation, e.g. tf('in_days', { n: 15 }) → "in 15 days". */
export function tf(key: string, vars: Record<string, string | number>, lang: Lang = 'bn'): string {
  let s = t(key, lang);
  for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}
