// lib/i18n.ts — minimal bn/en dictionary lookup (§B.5 Bengali-first).
import en from '../locales/en.json';
import bn from '../locales/bn.json';

const dict: Record<string, Record<string, string>> = { en, bn };

export function t(key: string, lang: 'en' | 'bn' = 'bn'): string {
  return dict[lang]?.[key] ?? key;
}
