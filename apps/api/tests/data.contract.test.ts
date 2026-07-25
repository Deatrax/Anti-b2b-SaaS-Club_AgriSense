// Data-contract tests (bug_report_tier0.md BUG-2): compute_financials crosses the seam
// between crop_rules.json crop keys and costs_bd.json price keys. The engine's own suite is
// green regardless of these files, which is exactly how a one-key mismatch (paddy_aman vs
// aman_rice) shipped a financial projection that crashed for EVERY crop. These tests pin the
// seam itself.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const dataDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../data');
const cropRules = JSON.parse(readFileSync(path.join(dataDir, 'crop_rules.json'), 'utf-8')) as {
  crops: Record<string, { fertilizer: { nutrients: Record<string, { dose: number }> }; base_yield_kg_per_ha: { value: number } }>;
};
const costs = JSON.parse(readFileSync(path.join(dataDir, 'costs_bd.json'), 'utf-8')) as {
  farmgate_prices_bdt_per_kg: Record<string, { value: number }>;
  seed: Record<string, { rate_kg_per_ha: number; price_bdt_per_kg: number }>;
  fertilizer_prices_bdt_per_kg: Record<string, { value?: number }>;
  operations_bdt_per_ha: Record<string, { value: number }>;
};

const DEMO_CROP = 'aman_rice';

/** Crops we KNOWINGLY cannot cost yet — no citable farmgate/seed source landed in time.
 * compute_financials throws an honest "not modeled" error for these at runtime. If you add
 * a sourced price for one, REMOVE it here so the strict block below starts guarding it. */
const KNOWN_COSTING_GAPS = ['boro_rice', 'aus_rice'];

describe('costs_bd.json ↔ crop_rules.json seam', () => {
  it(`the demo crop (${DEMO_CROP}) has a farmgate price under its crop_rules key`, () => {
    const entry = costs.farmgate_prices_bdt_per_kg[DEMO_CROP];
    expect(entry, `farmgate_prices_bdt_per_kg.${DEMO_CROP} missing — compute_financials will throw for the demo crop`).toBeDefined();
    expect(entry!.value).toBeGreaterThan(0);
  });

  it(`the demo crop (${DEMO_CROP}) has a seed entry`, () => {
    const seed = costs.seed[DEMO_CROP];
    expect(seed, `seed.${DEMO_CROP} missing — seed cost would be silently omitted`).toBeDefined();
    expect(seed!.rate_kg_per_ha).toBeGreaterThan(0);
    expect(seed!.price_bdt_per_kg).toBeGreaterThan(0);
  });

  it('every crop is either fully costed or on the known-gaps ledger — never silently half-costed', () => {
    for (const crop of Object.keys(cropRules.crops)) {
      const costed = costs.farmgate_prices_bdt_per_kg[crop] != null && costs.seed[crop] != null;
      const onLedger = KNOWN_COSTING_GAPS.includes(crop);
      expect(
        costed || onLedger,
        `crop "${crop}" has partial/no costing data and is not on KNOWN_COSTING_GAPS — either source its prices or add it to the ledger`,
      ).toBe(true);
      expect(costed && onLedger, `crop "${crop}" is fully costed — remove it from KNOWN_COSTING_GAPS`).toBe(false);
    }
  });

  it('every fertilizer carrier compute_financials maps to has a price', () => {
    for (const carrier of ['urea', 'tsp', 'mop', 'gypsum']) {
      expect(costs.fertilizer_prices_bdt_per_kg[carrier]?.value, `fertilizer price for ${carrier} missing`).toBeGreaterThan(0);
    }
  });

  it('operations table is non-empty with positive per-ha rates', () => {
    const ops = Object.entries(costs.operations_bdt_per_ha);
    expect(ops.length).toBeGreaterThan(0);
    for (const [op, spec] of ops) {
      expect(spec.value, `operations_bdt_per_ha.${op}`).toBeGreaterThan(0);
    }
  });
});
