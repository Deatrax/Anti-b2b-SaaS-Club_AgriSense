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

  /** build_season_plan calls this alongside PlanEventModel.replaceForCycle — the weather
   * snapshot is what makes a plan reproducible later (§B.3). Revision auto-increments. */
  async create(cropCycleId: string, weatherSnapshot: unknown): Promise<Omit<SeasonPlan, 'events'>> {
    const latest = await this.getLatestForCycle(cropCycleId);
    const revision = (latest?.revision ?? 0) + 1;
    const [row] = await query<SeasonPlanRow>(
      'insert into season_plans (crop_cycle_id, revision, weather_snapshot) values ($1,$2,$3::jsonb) returning *',
      [cropCycleId, revision, JSON.stringify(weatherSnapshot)],
    );
    return {
      id: row!.id,
      cropCycleId: row!.crop_cycle_id,
      revision: row!.revision,
      weatherSnapshot: row!.weather_snapshot,
      generatedAt: row!.generated_at,
    };
  },
};
