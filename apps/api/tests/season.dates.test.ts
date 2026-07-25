// resolveSeasonDates — the calendar year-anchoring fix (bug_report_tier0.md BUG-5).
// The live test produced a plan that sowed 2026-07-25 but transplanted 2027-07-31 — a 371-day
// gap — because every window's year was resolved from `now` against the sowing-window start,
// not from the sowing date. These tests pin the invariant: the chain never splits years.
// `todayIso` is a parameter, so no clock mocking is needed.
import { describe, it, expect } from 'vitest';
import { resolveSeasonDates } from '../src/services/tools/planning.tools';

// Real aman_rice windows from data/crop_rules.json.
const amanCalendar = {
  sowing_window: { start: '07-01', end: '08-15' },
  transplant_window: { start: '08-01' },
  harvest_window: { start: '11-15' },
};
// Real boro_rice windows: sown in winter, harvested the following spring (year wrap).
const boroCalendar = {
  sowing_window: { start: '11-01', end: '12-15' },
  transplant_window: { start: '12-15' },
  harvest_window: { start: '04-15' },
};

const iso = (s: string) => s; // readability
const daysBetween = (a: string, b: string) =>
  Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);

describe('resolveSeasonDates (BUG-5 year rollover)', () => {
  it('mid-window today keeps the whole chain in the same year (the live-test scenario)', () => {
    const r = resolveSeasonDates(amanCalendar, iso('2026-07-25'), 25, '2026-07-25');
    expect(r.sowingDate).toBe('2026-07-25');
    // Sowing 07-25 + 25-day nursery = 08-19, past the 08-01 window start, so nursery wins.
    expect(r.transplantWindowStart).toBe('2026-08-19');
    expect(r.harvestWindowStart).toBe('2026-11-15');
    // The exact failure from the live test: transplant must not be a year after sowing.
    expect(daysBetween(r.sowingDate, r.transplantWindowStart)).toBeLessThan(60);
    expect(daysBetween(r.sowingDate, r.harvestWindowStart)).toBeLessThan(200);
  });

  it('defaults sowing to today when the window is already open', () => {
    const r = resolveSeasonDates(amanCalendar, iso('2026-07-25'), 25);
    expect(r.sowingDate).toBe('2026-07-25');
  });

  it('defaults sowing to the window start when the window is still upcoming', () => {
    const r = resolveSeasonDates(amanCalendar, iso('2026-06-10'), 25);
    expect(r.sowingDate).toBe('2026-07-01');
    expect(r.transplantWindowStart).toBe('2026-08-01');
    expect(r.harvestWindowStart).toBe('2026-11-15');
  });

  it('rolls to NEXT year when this year\'s window has already closed', () => {
    const r = resolveSeasonDates(amanCalendar, iso('2026-09-20'), 25);
    expect(r.sowingDate).toBe('2027-07-01');
    expect(r.transplantWindowStart).toBe('2027-08-01');
    expect(r.harvestWindowStart).toBe('2027-11-15');
  });

  it('uses the nursery-duration fallback when a late explicit sowing would roll transplant a year out', () => {
    const r = resolveSeasonDates(amanCalendar, iso('2026-08-20'), 25, '2026-08-20');
    // 08-01 is already past 08-20, so firstOnOrAfter would give 2027-08-01 (>300 days) →
    // fall back to sowing + nursery.
    expect(r.transplantWindowStart).toBe('2026-09-14'); // 2026-08-20 + 25
    expect(r.assumptions.some((a) => /nursery/.test(a))).toBe(true);
    expect(daysBetween(r.sowingDate, r.transplantWindowStart)).toBeLessThan(60);
  });

  it('handles Boro\'s winter-to-spring wrap without splitting into a 3rd year', () => {
    const r = resolveSeasonDates(boroCalendar, iso('2026-11-20'), 40, '2026-11-20');
    expect(r.sowingDate).toBe('2026-11-20');
    // Sowing 11-20 + 40-day nursery = 12-30, past the 12-15 window start → nursery wins.
    expect(r.transplantWindowStart).toBe('2026-12-30');
    expect(r.harvestWindowStart).toBe('2027-04-15'); // next spring, correctly one wrap only
    expect(daysBetween(r.transplantWindowStart, r.harvestWindowStart)).toBeLessThan(200);
  });

  it('monotonicity: land sequence is strictly ordered for every first-of-month "today"', () => {
    for (let m = 1; m <= 12; m++) {
      const today = `2026-${String(m).padStart(2, '0')}-01`;
      const r = resolveSeasonDates(amanCalendar, today, 25);
      expect(r.sowingDate < r.transplantWindowStart, `sowing<transplant for ${today}`).toBe(true);
      expect(r.transplantWindowStart < r.harvestWindowStart, `transplant<harvest for ${today}`).toBe(true);
    }
  });
});
