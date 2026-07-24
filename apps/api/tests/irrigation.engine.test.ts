// irrigation.engine tests (§C.9 FAO-56 water balance: need = ET0 × Kc − effective_rainfall).
import { describe, it, expect } from 'vitest';
import { irrigationSchedule, type IrrigationDayInput } from '../src/services/engines/irrigation.engine';

describe('irrigationSchedule (§C.9)', () => {
  it('computes crop water use as ET0 × Kc', () => {
    const { days } = irrigationSchedule([{ date: '2026-08-01', et0: 4, kc: 1.1, rainfallMm: 0 }]);
    expect(days[0]!.cropWaterUseMm).toBeCloseTo(4.4, 10);
  });

  it('net irrigation need is water use minus rainfall when rainfall is the smaller term', () => {
    const { days } = irrigationSchedule([{ date: '2026-08-01', et0: 5, kc: 1.2, rainfallMm: 2 }]);
    expect(days[0]!.netIrrigationMm).toBeCloseTo(4, 10); // 6.0 - 2
  });

  it('floors net irrigation need at 0 when rainfall exceeds crop water use', () => {
    const { days } = irrigationSchedule([{ date: '2026-08-01', et0: 3, kc: 1.0, rainfallMm: 20 }]);
    expect(days[0]!.netIrrigationMm).toBe(0);
  });

  it('sums net irrigation need across days for the total', () => {
    const input: IrrigationDayInput[] = [
      { date: '2026-08-01', et0: 4, kc: 1.1, rainfallMm: 0 }, // net 4.4
      { date: '2026-08-02', et0: 4, kc: 1.1, rainfallMm: 10 }, // net 0 (rain exceeds)
      { date: '2026-08-03', et0: 5, kc: 1.2, rainfallMm: 1 }, // net 5.0
    ];
    const { totalIrrigationMm } = irrigationSchedule(input);
    expect(totalIrrigationMm).toBeCloseTo(9.4, 10);
  });

  it('an empty schedule totals to zero without dividing by zero', () => {
    const { days, totalIrrigationMm } = irrigationSchedule([]);
    expect(days).toEqual([]);
    expect(totalIrrigationMm).toBe(0);
  });

  it('doubling ET0 for a day doubles that day\'s crop water use (consistency, Tier-0 #5)', () => {
    const base = irrigationSchedule([{ date: '2026-08-01', et0: 4, kc: 1.1, rainfallMm: 0 }]).days[0]!.cropWaterUseMm;
    const doubled = irrigationSchedule([{ date: '2026-08-01', et0: 8, kc: 1.1, rainfallMm: 0 }]).days[0]!.cropWaterUseMm;
    expect(doubled).toBeCloseTo(base * 2, 10);
  });
});
