// M — farms. Auto-created and auto-named "<name>'s farm" during onboarding (§B.3).
import { query } from '../config/db';

export interface FarmRow {
  id: string;
  user_id: string;
  name: string | null;
  district: string | null;
  lat: number | null;
  lon: number | null;
  aez: number | null;
}

export const FarmModel = {
  async listByUser(userId: string): Promise<FarmRow[]> {
    return query<FarmRow>('select * from farms where user_id = $1 order by created_at', [userId]);
  },

  async get(id: string): Promise<FarmRow | null> {
    const [row] = await query<FarmRow>('select * from farms where id = $1', [id]);
    return row ?? null;
  },

  // TODO: create(userId, { name, district, lat, lon, aez }) — district → lat/lon/aez from districts.json.
};
