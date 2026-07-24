// M — farms. Auto-created and auto-named "<name>'s farm" during onboarding (§B.3).
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
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

interface DistrictEntry {
  name: string;
  name_bn: string;
  lat: number;
  lon: number;
  aez: number;
  aez_name: string;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const districtsPath = path.resolve(__dirname, '../../../../data/districts.json');
const DISTRICTS: DistrictEntry[] = JSON.parse(readFileSync(districtsPath, 'utf-8')).districts;

function lookupDistrict(name: string): DistrictEntry {
  const d = DISTRICTS.find((x) => x.name.toLowerCase() === name.trim().toLowerCase());
  if (!d) {
    const known = DISTRICTS.map((x) => x.name).join(', ');
    throw new Error(`unknown district "${name}" — not in data/districts.json (have: ${known})`);
  }
  return d;
}

export const FarmModel = {
  async listByUser(userId: string): Promise<FarmRow[]> {
    return query<FarmRow>('select * from farms where user_id = $1 order by created_at', [userId]);
  },

  async get(id: string): Promise<FarmRow | null> {
    const [row] = await query<FarmRow>('select * from farms where id = $1', [id]);
    return row ?? null;
  },

  /** district → lat/lon/aez looked up from data/districts.json — the join key (§C.5). */
  async create(userId: string, data: { name: string; district: string }): Promise<FarmRow> {
    const d = lookupDistrict(data.district);
    const [row] = await query<FarmRow>(
      `insert into farms (user_id, name, district, lat, lon, aez) values ($1,$2,$3,$4,$5,$6) returning *`,
      [userId, data.name, d.name, d.lat, d.lon, d.aez],
    );
    return row!;
  },
};
