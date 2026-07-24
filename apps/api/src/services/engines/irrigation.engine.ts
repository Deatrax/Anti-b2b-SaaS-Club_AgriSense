// engines/irrigation.engine.ts — PURE. Water balance: need = ET0 × Kc − effective_rainfall (FAO-56).
export function irrigationSchedule(_input: unknown): unknown {
  // TODO: per-stage Kc (crop_rules.kc_by_stage) × Open-Meteo ET0 − effective rainfall → schedule.
  throw new Error('irrigationSchedule not implemented');
}
