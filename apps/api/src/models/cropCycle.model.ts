// M — crop cycles. history() feeds rotation_fit; past cycles influence the next (§B.3).
import { query } from '../config/db';

export interface CropCycleRow {
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

interface CropCycleRawRow extends Omit<CropCycleRow, 'actual_yield_kg'> {
  actual_yield_kg: string | null;
}

function toCropCycleRow(r: CropCycleRawRow): CropCycleRow {
  return { ...r, actual_yield_kg: r.actual_yield_kg != null ? Number(r.actual_yield_kg) : null };
}

export const CropCycleModel = {
  async listByField(fieldId: string): Promise<CropCycleRow[]> {
    const rows = await query<CropCycleRawRow>(
      'select * from crop_cycles where field_id = $1 order by created_at desc',
      [fieldId],
    );
    return rows.map(toCropCycleRow);
  },

  async history(fieldId: string): Promise<CropCycleRow[]> {
    const rows = await query<CropCycleRawRow>(
      "select * from crop_cycles where field_id = $1 and status = 'harvested' order by created_at desc",
      [fieldId],
    );
    return rows.map(toCropCycleRow);
  },

  /** Creates a 'planned' cycle. Called with just `season` during GATHERING (§C.8 target_season
   * derivation), then the rest (crop/variety/dates) filled once PLANNING picks a crop. */
  async create(
    fieldId: string,
    data: {
      season: string;
      crop?: string;
      variety?: string;
      sowingDate?: string;
      expectedHarvest?: string;
      status?: 'planned' | 'active';
    },
  ): Promise<CropCycleRow> {
    const [row] = await query<CropCycleRawRow>(
      `insert into crop_cycles (field_id, crop, variety, season, sowing_date, expected_harvest, status)
       values ($1,$2,$3,$4,$5,$6,$7) returning *`,
      [
        fieldId,
        data.crop ?? null,
        data.variety ?? null,
        data.season,
        data.sowingDate ?? null,
        data.expectedHarvest ?? null,
        data.status ?? 'planned',
      ],
    );
    return toCropCycleRow(row!);
  },

  /** Harvest marked done → the cycle is over; the field re-enters PLANNING for next season. */
  async complete(cycleId: string): Promise<void> {
    await query("update crop_cycles set status = 'harvested' where id = $1", [cycleId]);
  },
};
