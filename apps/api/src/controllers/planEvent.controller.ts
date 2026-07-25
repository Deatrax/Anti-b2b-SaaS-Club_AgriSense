// C — plan events. The Plan tab's "Done" button lands here. Marking the harvest stage done
// closes the whole crop cycle (status → harvested), which flips the field back to PLANNING —
// the same conversational intake→plan flow then runs again for the next season (§1.2 #1/#4).
import type { Request, Response, NextFunction } from 'express';
import { query } from '../config/db';
import { PlanEventModel } from '../models/planEvent.model';
import { CropCycleModel } from '../models/cropCycle.model';
import { ConversationModel } from '../models/conversation.model';

const SEASON_COMPLETE_MESSAGE =
  'Harvest logged — this season is complete! 🌾 When you are ready, tell me and I will plan the next season for this field: ' +
  'I will check the weather, rank candidate crops against your soil and this harvest, and build a fresh costed calendar.';

export async function markPlanEventDone(req: Request, res: Response, next: NextFunction) {
  const id = req.params.id;
  if (!id) {
    res.status(400).json({ error: 'plan event id is required' });
    return;
  }
  try {
    const event = await PlanEventModel.markDone(id);
    if (!event) {
      res.status(404).json({ error: 'plan event not found' });
      return;
    }

    let cycleCompleted = false;
    if (event.stageKey === 'harvest') {
      await CropCycleModel.complete(event.cropCycleId);
      cycleCompleted = true;
      const [row] = await query<{ field_id: string }>('select field_id from crop_cycles where id = $1', [event.cropCycleId]);
      if (row) await ConversationModel.postProactive(row.field_id, SEASON_COMPLETE_MESSAGE);
    }

    res.json({ event, cycleCompleted });
  } catch (err) {
    next(err);
  }
}
