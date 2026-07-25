// toDhakaDate — timezone-safe plan dates (bug_report_tier0.md BUG-14).
import { describe, it, expect } from 'vitest';
import { toDhakaDate } from '../src/views/date';

describe('toDhakaDate', () => {
  it('recovers the Dhaka calendar date from a prior-day UTC instant (the pg-date artifact)', () => {
    // pg returns 2026-07-18 (a date column) as Dhaka-local midnight → this UTC instant.
    expect(toDhakaDate('2026-07-17T18:00:00.000Z')).toBe('2026-07-18');
  });

  it('passes through a plain YYYY-MM-DD unchanged', () => {
    expect(toDhakaDate('2026-08-19')).toBe('2026-08-19');
  });

  it('formats a Date object in Asia/Dhaka', () => {
    expect(toDhakaDate(new Date('2026-11-14T18:00:00.000Z'))).toBe('2026-11-15');
  });

  it('returns null for null/undefined', () => {
    expect(toDhakaDate(null)).toBeNull();
    expect(toDhakaDate(undefined)).toBeNull();
  });
});
