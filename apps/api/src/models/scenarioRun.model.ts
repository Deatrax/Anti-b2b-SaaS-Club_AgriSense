// M — scenario simulation runs (§A.1 T1 gap). Each "what if" recompute is persisted so the
// farmer's question and the answer both have a record, not just a transient response.
import { query } from '../config/db';
import type { ScenarioRun } from '@agrisense/shared';

interface ScenarioRunRow {
  id: string;
  crop_cycle_id: string;
  label: string;
  constraint_json: unknown;
  overrides: unknown;
  result: unknown;
  diff: unknown;
  created_at: string;
}

function toScenarioRun(r: ScenarioRunRow): ScenarioRun {
  return {
    id: r.id,
    cropCycleId: r.crop_cycle_id,
    label: r.label,
    constraintJson: r.constraint_json,
    overrides: r.overrides,
    result: r.result,
    diff: r.diff,
    createdAt: r.created_at,
  };
}

export const ScenarioRunModel = {
  async create(cropCycleId: string, label: string, overrides: unknown, result: unknown, diff: unknown): Promise<ScenarioRun> {
    const [row] = await query<ScenarioRunRow>(
      `insert into scenario_runs (crop_cycle_id, label, overrides, result, diff)
       values ($1,$2,$3::jsonb,$4::jsonb,$5::jsonb) returning *`,
      [cropCycleId, label, JSON.stringify(overrides), JSON.stringify(result), JSON.stringify(diff)],
    );
    return toScenarioRun(row!);
  },

  async listByCycle(cropCycleId: string): Promise<ScenarioRun[]> {
    const rows = await query<ScenarioRunRow>(
      'select * from scenario_runs where crop_cycle_id = $1 order by created_at desc',
      [cropCycleId],
    );
    return rows.map(toScenarioRun);
  },
};
