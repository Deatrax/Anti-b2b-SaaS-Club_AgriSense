// M — plan events (the dated calendar rows). build_season_plan replaces the set atomically.
import { query } from '../config/db';
import type { PlanEvent } from '@agrisense/shared';

export const PlanEventModel = {
  async listByCycle(cropCycleId: string): Promise<PlanEvent[]> {
    return query<PlanEvent>(
      'select * from plan_events where crop_cycle_id = $1 order by sort_order',
      [cropCycleId],
    );
  },

  async replaceForCycle(cropCycleId: string, events: PlanEvent[]): Promise<void> {
    // TODO: transactionally delete existing rows + insert `events` (used by build_season_plan).
    void cropCycleId;
    void events;
  },

  async markShifted(eventId: string, newDate: string, shiftReason: string): Promise<void> {
    // TODO: set actual/planned date + status='shifted' + shift_reason (weather-trigger, §B.4).
    void eventId;
    void newDate;
    void shiftReason;
  },
};
