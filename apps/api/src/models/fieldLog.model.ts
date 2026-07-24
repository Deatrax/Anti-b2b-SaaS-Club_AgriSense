// M — field logs. A farmer write here is a NEW input channel to the agent (§A.2 edit-and-replan).
import { query } from '../config/db';

export interface FieldLogRow {
  id: string;
  field_id: string;
  crop_cycle_id: string | null;
  kind: string; // irrigation | fertilizer | pest | observation
  payload: unknown;
  logged_by: string;
  occurred_at: string;
}

export const FieldLogModel = {
  async add(fieldId: string, kind: string, payload: unknown, cropCycleId?: string): Promise<FieldLogRow> {
    const [row] = await query<FieldLogRow>(
      'insert into field_logs (field_id, crop_cycle_id, kind, payload) values ($1,$2,$3,$4) returning *',
      [fieldId, cropCycleId ?? null, kind, JSON.stringify(payload)],
    );
    return row!;
  },

  async listByField(fieldId: string): Promise<FieldLogRow[]> {
    return query<FieldLogRow>(
      'select * from field_logs where field_id = $1 order by occurred_at desc',
      [fieldId],
    );
  },
};
