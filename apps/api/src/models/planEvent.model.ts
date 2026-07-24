// M — plan events (the dated calendar rows). build_season_plan replaces the set atomically.
import { query, withTransaction } from '../config/db';
import type { PlanEvent, PlanEventStatus, Provenance } from '@agrisense/shared';

interface PlanEventRow {
  id: string;
  crop_cycle_id: string;
  stage_key: string;
  title: string;
  action: string | null;
  quantity: string | null;
  unit: string | null;
  planned_date: string | null;
  actual_date: string | null;
  status: PlanEventStatus;
  shift_reason: string | null;
  sources: Provenance[] | null;
  sort_order: number;
}

function toPlanEvent(r: PlanEventRow): PlanEvent {
  return {
    id: r.id,
    cropCycleId: r.crop_cycle_id,
    stageKey: r.stage_key,
    title: r.title,
    action: r.action,
    quantity: r.quantity != null ? Number(r.quantity) : null,
    unit: r.unit,
    plannedDate: r.planned_date,
    actualDate: r.actual_date,
    status: r.status,
    shiftReason: r.shift_reason,
    sources: r.sources ?? [],
    sortOrder: r.sort_order,
  };
}

export const PlanEventModel = {
  async listByCycle(cropCycleId: string): Promise<PlanEvent[]> {
    const rows = await query<PlanEventRow>(
      'select * from plan_events where crop_cycle_id = $1 order by sort_order',
      [cropCycleId],
    );
    return rows.map(toPlanEvent);
  },

  /** Used by build_season_plan — a full replan replaces the whole calendar atomically. */
  async replaceForCycle(cropCycleId: string, events: PlanEvent[]): Promise<void> {
    await withTransaction(async (client) => {
      await client.query('delete from plan_events where crop_cycle_id = $1', [cropCycleId]);
      for (const e of events) {
        await client.query(
          `insert into plan_events
             (crop_cycle_id, stage_key, title, action, quantity, unit, planned_date, actual_date,
              status, shift_reason, sources, sort_order)
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12)`,
          [
            cropCycleId,
            e.stageKey,
            e.title,
            e.action,
            e.quantity,
            e.unit,
            e.plannedDate,
            e.actualDate,
            e.status,
            e.shiftReason,
            JSON.stringify(e.sources ?? []),
            e.sortOrder,
          ],
        );
      }
    });
  },

  /** A single event moved by a weather trigger — the trigger value IS the shift_reason (§B.4). */
  async markShifted(eventId: string, newDate: string, shiftReason: string): Promise<void> {
    await query(
      `update plan_events set planned_date = $2, status = 'shifted', shift_reason = $3 where id = $1`,
      [eventId, newDate, shiftReason],
    );
  },

  async get(eventId: string): Promise<PlanEvent | null> {
    const [row] = await query<PlanEventRow>('select * from plan_events where id = $1', [eventId]);
    return row ? toPlanEvent(row) : null;
  },

  /** Farmer taps "Done" on a plan card — records when it actually happened. */
  async markDone(eventId: string): Promise<PlanEvent | null> {
    const [row] = await query<PlanEventRow>(
      `update plan_events set status = 'done', actual_date = current_date where id = $1 returning *`,
      [eventId],
    );
    return row ? toPlanEvent(row) : null;
  },
};
