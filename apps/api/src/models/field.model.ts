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

/** Raw shape as `pg` actually returns it: `numeric` columns come back as strings, not numbers. */
interface FieldRawRow extends Omit<FieldRow, 'area_ha' | 'budget_bdt'> {
  area_ha: string | null;
  budget_bdt: string | null;
}

function toFieldRow(r: FieldRawRow): FieldRow {
  return {
    ...r,
    area_ha: r.area_ha != null ? Number(r.area_ha) : null,
    budget_bdt: r.budget_bdt != null ? Number(r.budget_bdt) : null,
  };
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
  actual_yield_kg: string | null; // numeric column — raw from pg, coerced in toCycle()
}

/** Shared by getState() and listByFarm() — one field row → its full FieldState. */
async function stateForField(field: FieldRow): Promise<FieldState> {
  const [activeCycle] = await query<CycleRow>(
    "select * from crop_cycles where field_id = $1 and status = 'active' limit 1",
    [field.id],
  );
  // No active cycle exists yet during GATHERING — target_season lives on a 'planned' cycle
  // created as soon as the farmer answers it, before any crop is chosen (§C.8).
  const [plannedCycle] = activeCycle
    ? []
    : await query<CycleRow>(
        "select * from crop_cycles where field_id = $1 and status = 'planned' order by created_at desc limit 1",
        [field.id],
      );
  const targetSeason = activeCycle?.season ?? plannedCycle?.season ?? null;
  return {
    identity: toIdentity(field),
    activeCycle: activeCycle ? toCycle(activeCycle) : null,
    missingFields: computeMissing(field, targetSeason),
  };
}

export const FieldModel = {
  async getState(fieldId: string): Promise<FieldState> {
    const [rawField] = await query<FieldRawRow>('select * from fields where id = $1', [fieldId]);
    if (!rawField) throw new Error(`field ${fieldId} not found`);
    return stateForField(toFieldRow(rawField));
  },

  /** Farm → its fields (active + read-only historical) — the seam the farm page reads (§B.3). */
  async listByFarm(farmId: string): Promise<FieldState[]> {
    const rawFields = await query<FieldRawRow>('select * from fields where farm_id = $1 order by created_at', [farmId]);
    return Promise.all(rawFields.map(toFieldRow).map(stateForField));
  },

  /** Creates a bare, empty field row — starts with nothing filled in. The agent's
   * update_field tool populates it through conversation, not a form (§B.3 "empty ground"). */
  async create(farmId: string, name?: string): Promise<FieldIdentity> {
    const [row] = await query<FieldRawRow>(
      'insert into fields (farm_id, name) values ($1, $2) returning *',
      [farmId, name ?? null],
    );
    return toIdentity(toFieldRow(row!));
  },

  async update(fieldId: string, patch: Partial<FieldRow>): Promise<void> {
    const keys = Object.keys(patch) as (keyof FieldRow)[];
    if (keys.length === 0) return;
    const setClause = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
    const values = keys.map((k) => patch[k]);
    await query(`update fields set ${setClause}, updated_at = now() where id = $1`, [fieldId, ...values]);
  },
};

/** The six intake slots → what's still empty. Drives GATHERING vs PLANNING (§C.8). */
function computeMissing(f: FieldRow, targetSeason: string | null): IntakeField[] {
  const present: Record<IntakeField, boolean> = {
    location: f.lat != null && f.lon != null,
    area_ha: f.area_ha != null,
    soil_type: f.soil_type != null,
    water_source: f.water_source != null,
    budget_bdt: f.budget_bdt != null,
    target_season: targetSeason != null,
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
    actualYieldKg: c.actual_yield_kg != null ? Number(c.actual_yield_kg) : null,
  };
}
