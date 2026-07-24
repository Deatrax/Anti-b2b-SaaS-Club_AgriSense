// engines/irrigation.engine.ts — PURE. Water balance: need = ET0 × Kc − effective_rainfall (FAO-56).
// `rainfallMm` is treated AS effective rainfall (a documented simplification — a proper
// effective-rainfall method like USDA SCS discounts runoff from heavy storms; out of scope here).

export interface IrrigationDayInput {
  date: string;
  /** Reference evapotranspiration, mm/day (Open-Meteo et0_fao_evapotranspiration). */
  et0: number;
  /** Crop coefficient for whatever growth stage this date falls in (crop_rules.kc_by_stage). */
  kc: number;
  /** Treated as effective rainfall — see file header. */
  rainfallMm: number;
}

export interface IrrigationDayResult extends IrrigationDayInput {
  /** Crop water use = ET0 × Kc (FAO-56 ETc). */
  cropWaterUseMm: number;
  /** max(0, cropWaterUseMm − rainfallMm) — rainfall can't produce a negative irrigation need. */
  netIrrigationMm: number;
}

export interface IrrigationScheduleResult {
  days: IrrigationDayResult[];
  totalIrrigationMm: number;
}

export function irrigationSchedule(days: IrrigationDayInput[]): IrrigationScheduleResult {
  const result = days.map((d) => {
    const cropWaterUseMm = d.et0 * d.kc;
    const netIrrigationMm = Math.max(0, cropWaterUseMm - d.rainfallMm);
    return { ...d, cropWaterUseMm, netIrrigationMm };
  });
  const totalIrrigationMm = result.reduce((sum, d) => sum + d.netIrrigationMm, 0);
  return { days: result, totalIrrigationMm };
}
