// V — field serializer. DB/domain state → the JSON shape the dashboard renders.
// This file is a SEAM (Mahim → Masnun): agree the shape once, build against it (§C.3).
import type { FieldState } from '@agrisense/shared';
import { toDhakaDate } from './date';

export function serializeField(state: FieldState) {
  const { identity, activeCycle, missingFields } = state;
  return {
    id: identity.id,
    farmId: identity.farmId,
    name: identity.name,
    areaHa: identity.areaHa,
    soilType: identity.soilType,
    waterSource: identity.waterSource,
    lat: identity.lat,
    lon: identity.lon,
    budgetBdt: identity.budgetBdt,
    // sowing/harvest are pg date columns → prior-day UTC if emitted raw (BUG-14).
    activeCycle: activeCycle
      ? { ...activeCycle, sowingDate: toDhakaDate(activeCycle.sowingDate), expectedHarvest: toDhakaDate(activeCycle.expectedHarvest) }
      : activeCycle,
    missingFields,
  };
}
