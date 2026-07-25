// M — pest/disease risk windows (§A.1 T1). assess_pest_risk replaces the set atomically,
// same pattern as PlanEventModel — the forward-looking risk picture is always fully recomputed,
// not accumulated.
import { query, withTransaction } from '../config/db';
import type { RiskWindow, RiskLevel, Provenance } from '@agrisense/shared';

interface RiskWindowRow {
  id: string;
  crop_cycle_id: string;
  pest: string;
  level: RiskLevel;
  starts_on: string | null;
  ends_on: string | null;
  trigger: unknown;
  prevention: string | null;
  treatment: string | null;
  est_cost_bdt: string | null;
  sources: Provenance[] | null;
}

function toRiskWindow(r: RiskWindowRow): RiskWindow {
  return {
    id: r.id,
    cropCycleId: r.crop_cycle_id,
    pest: r.pest,
    level: r.level,
    startsOn: r.starts_on,
    endsOn: r.ends_on,
    trigger: r.trigger,
    prevention: r.prevention,
    treatment: r.treatment,
    estCostBdt: r.est_cost_bdt != null ? Number(r.est_cost_bdt) : null,
    sources: r.sources ?? [],
  };
}

export const RiskWindowModel = {
  async listByCycle(cropCycleId: string): Promise<RiskWindow[]> {
    const rows = await query<RiskWindowRow>(
      'select * from risk_windows where crop_cycle_id = $1 order by starts_on nulls last',
      [cropCycleId],
    );
    return rows.map(toRiskWindow);
  },

  async replaceForCycle(cropCycleId: string, windows: RiskWindow[]): Promise<void> {
    await withTransaction(async (client) => {
      await client.query('delete from risk_windows where crop_cycle_id = $1', [cropCycleId]);
      for (const w of windows) {
        await client.query(
          `insert into risk_windows
             (crop_cycle_id, pest, level, starts_on, ends_on, trigger, prevention, treatment, est_cost_bdt, sources)
           values ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9,$10::jsonb)`,
          [
            cropCycleId,
            w.pest,
            w.level,
            w.startsOn,
            w.endsOn,
            JSON.stringify(w.trigger ?? null),
            w.prevention,
            w.treatment,
            w.estCostBdt,
            JSON.stringify(w.sources ?? []),
          ],
        );
      }
    });
  },
};
