// V — date serialization. pg returns `date` columns as JS Date objects at the server's LOCAL
// midnight, which serialize to a prior-day UTC instant (e.g. 2026-07-18 → "2026-07-17T18:00Z"
// on an Asia/Dhaka server). Any UI formatting that instant in UTC shows the plan one day early
// (bug_report_tier0.md BUG-14). Emit plain Asia/Dhaka calendar dates instead — the farm is in
// Bangladesh, which has no DST, so this is stable year-round.
export function toDhakaDate(value: string | Date | null | undefined): string | null {
  if (value == null) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return typeof value === 'string' ? value : null;
  // en-CA gives ISO-style YYYY-MM-DD.
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });
}
