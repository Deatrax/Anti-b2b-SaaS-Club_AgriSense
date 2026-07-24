// M — season plan metadata. The weather_snapshot + revision wrapper around plan_events rows
// (§B.3 reproducibility — replaying an old plan needs the weather it was built from).
import { query } from '../config/db';
import type { SeasonPlan } from '@agrisense/shared';

interface SeasonPlanRow {
  id: string;
  crop_cycle_id: string;
  revision: number;
  weather_snapshot: unknown;
  generated_at: string;
}

export const SeasonPlanModel = {
  async getLatestForCycle(cropCycleId: string): Promise<Omit<SeasonPlan, 'events'> | null> {
    const [row] = await query<SeasonPlanRow>(
      'select * from season_plans where crop_cycle_id = $1 order by revision desc limit 1',
      [cropCycleId],
    );
    if (!row) return null;
    return {
      id: row.id,
      cropCycleId: row.crop_cycle_id,
      revision: row.revision,
      weatherSnapshot: row.weather_snapshot,
      generatedAt: row.generated_at,
    };
  },
};
