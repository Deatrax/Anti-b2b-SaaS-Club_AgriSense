// M — fields. getState() is the seam the whole agent reads: identity + active cycle +
// which of the six intake slots are still empty (§1.2 #1, §B.4, §C.8 phase derivation).
import { query } from '../config/db';
import {
  REQUIRED_INTAKE_FIELDS,
  type FieldState,
  type FieldIdentity,
  type CropCycle,
  type IntakeField,
} from '@agrisense/shared';

interface FieldRow {
  id: string;
  farm_id: string;
  name: string | null;
  area_ha: number | null;
  soil_type: string | null;
  water_source: string | null;
  lat: number | null;
  lon: number | null;
  budget_bdt: number | null;
}

interface CycleRow {
  id: string;
  field_id: string;
  crop: string | null;
  variety: string | null;
  season: string | null;
  sowing_date: string | null;
  expected_harvest: string | null;
  status: string;
  stage: string | null;
  day_index: number | null;
  actual_yield_kg: number | null;
}

export const FieldModel = {
  async getState(fieldId: string): Promise<FieldState> {
    const [field] = await query<FieldRow>('select * from fields where id = $1', [fieldId]);
    if (!field) throw new Error(`field ${fieldId} not found`);
    const [cycle] = await query<CycleRow>(
      "select * from crop_cycles where field_id = $1 and status = 'active' limit 1",
      [fieldId],
    );
    return {
      identity: toIdentity(field),
      activeCycle: cycle ? toCycle(cycle) : null,
      missingFields: computeMissing(field),
    };
  },

  async update(fieldId: string, patch: Partial<FieldRow>): Promise<void> {
    // TODO: build a parameterized UPDATE from patch keys; set updated_at = now().
    void fieldId;
    void patch;
  },
};

/** The six intake slots → what's still empty. Drives GATHERING vs PLANNING (§C.8). */
function computeMissing(f: FieldRow): IntakeField[] {
  const present: Record<IntakeField, boolean> = {
    location: f.lat != null && f.lon != null,
    area_ha: f.area_ha != null,
    soil_type: f.soil_type != null,
    water_source: f.water_source != null,
    budget_bdt: f.budget_bdt != null,
    target_season: false, // TODO: derive from the active/planned crop_cycle.season
  };
  return REQUIRED_INTAKE_FIELDS.filter((k) => !present[k]);
}

function toIdentity(f: FieldRow): FieldIdentity {
  return {
    id: f.id,
    farmId: f.farm_id,
    name: f.name,
    areaHa: f.area_ha,
    soilType: f.soil_type as FieldIdentity['soilType'],
    waterSource: f.water_source as FieldIdentity['waterSource'],
    lat: f.lat,
    lon: f.lon,
    budgetBdt: f.budget_bdt,
  };
}

function toCycle(c: CycleRow): CropCycle {
  return {
    id: c.id,
    fieldId: c.field_id,
    crop: c.crop,
    variety: c.variety,
    season: c.season as CropCycle['season'],
    sowingDate: c.sowing_date,
    expectedHarvest: c.expected_harvest,
    status: c.status as CropCycle['status'],
    stage: c.stage,
    dayIndex: c.day_index,
    actualYieldKg: c.actual_yield_kg,
  };
}
