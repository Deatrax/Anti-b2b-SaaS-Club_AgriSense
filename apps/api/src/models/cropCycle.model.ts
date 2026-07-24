// M — crop cycles. history() feeds rotation_fit; past cycles influence the next (§B.3).
import { query } from '../config/db';

export interface CropCycleRow {
  id: string;
  field_id: string;
  crop: string | null;
  variety: string | null;
  season: string | null;
  status: string;
  stage: string | null;
  day_index: number | null;
}

export const CropCycleModel = {
  async listByField(fieldId: string): Promise<CropCycleRow[]> {
    return query<CropCycleRow>(
      'select * from crop_cycles where field_id = $1 order by created_at desc',
      [fieldId],
    );
  },

  async history(fieldId: string): Promise<CropCycleRow[]> {
    return query<CropCycleRow>(
      "select * from crop_cycles where field_id = $1 and status = 'harvested' order by created_at desc",
      [fieldId],
    );
  },

  // TODO: create(fieldId, { crop, variety, season, sowing_date }) → the new active cycle.
};
