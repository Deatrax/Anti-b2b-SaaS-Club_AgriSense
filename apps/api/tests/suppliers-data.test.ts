// apps/api/tests/suppliers-data.test.ts — data/suppliers.json is seeded/mock (not cited like
// costs_bd.json) but still needs to be internally consistent: every district must resolve,
// every price/delivery/rating must be a plausible positive number.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';

const dataDir = path.resolve(__dirname, '../../../data');

interface SuppliersFile {
  suppliers: Array<{
    id: string;
    name: string;
    district: string;
    rating: number;
    items: Record<string, { price_bdt_per_kg: number; delivery_days: number; in_stock: boolean }>;
  }>;
}
interface DistrictsFile {
  districts: Array<{ name: string }>;
}

const suppliers = JSON.parse(readFileSync(path.join(dataDir, 'suppliers.json'), 'utf-8')) as SuppliersFile;
const districts = JSON.parse(readFileSync(path.join(dataDir, 'districts.json'), 'utf-8')) as DistrictsFile;
const districtNames = new Set(districts.districts.map((d) => d.name));

const VALID_ITEM_KEYS = new Set([
  'urea', 'tsp', 'mop', 'gypsum',
  'seed_aman_rice', 'seed_boro_rice', 'seed_aus_rice', 'seed_potato', 'seed_maize',
]);

describe('data/suppliers.json (seeded/mock marketplace catalog)', () => {
  it('has at least 10 suppliers', () => {
    expect(suppliers.suppliers.length).toBeGreaterThanOrEqual(10);
  });

  it('every supplier has a unique id', () => {
    const ids = suppliers.suppliers.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every supplier district resolves in data/districts.json', () => {
    for (const s of suppliers.suppliers) {
      expect(districtNames.has(s.district), `supplier "${s.id}" has unknown district "${s.district}"`).toBe(true);
    }
  });

  it('every supplier has a rating in [1,5]', () => {
    for (const s of suppliers.suppliers) {
      expect(s.rating).toBeGreaterThanOrEqual(1);
      expect(s.rating).toBeLessThanOrEqual(5);
    }
  });

  it('every stocked item has a valid key and plausible positive values', () => {
    for (const s of suppliers.suppliers) {
      for (const [itemKey, offer] of Object.entries(s.items)) {
        expect(VALID_ITEM_KEYS.has(itemKey), `supplier "${s.id}" has unknown item key "${itemKey}"`).toBe(true);
        expect(offer.price_bdt_per_kg).toBeGreaterThan(0);
        expect(offer.delivery_days).toBeGreaterThan(0);
        expect(typeof offer.in_stock).toBe('boolean');
      }
    }
  });

  it('every fertilizer carrier (urea/tsp/mop/gypsum) is stocked by at least 2 in-stock suppliers', () => {
    for (const carrier of ['urea', 'tsp', 'mop', 'gypsum']) {
      const count = suppliers.suppliers.filter((s) => s.items[carrier]?.in_stock).length;
      expect(count, `only ${count} in-stock suppliers for "${carrier}"`).toBeGreaterThanOrEqual(2);
    }
  });
});
