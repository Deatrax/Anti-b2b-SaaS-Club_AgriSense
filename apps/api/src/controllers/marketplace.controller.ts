// C — marketplace supplier matching + selection. GET returns ranked offers per still-needed
// plan item; POST persists a choice and re-runs compute_financials directly (same pattern
// replan/trigger.service.ts uses to run a tool outside of chat) so Money/Checkout immediately
// reflect the chosen price — proposeBasket/approveAndDebit themselves are untouched.
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { getRegistry, type ToolCtx } from '../services/tools/registry';
import { ConversationModel } from '../models/conversation.model';
import { matchSuppliersForField, selectSupplierForField } from '../services/tools/marketplace.tools';
import type { AgentStream } from '../services/agent/stream';

/** No live SSE connection exists for a REST-triggered recompute — mirrors
 * replan/trigger.service.ts's createNoopStream(). Tool calls are still traced for real. */
function createNoopStream(): AgentStream {
  return { text: () => {}, toolStart: () => {}, toolEnd: () => {}, notice: () => {}, done: () => {} };
}

export async function getMarketplaceMatches(req: Request, res: Response, next: NextFunction) {
  const fieldId = req.params.id;
  if (!fieldId) {
    res.status(400).json({ error: 'field id is required' });
    return;
  }
  try {
    const result = await matchSuppliersForField(fieldId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export const selectSupplierSchema = z.object({
  itemKey: z.string().min(1),
  supplierId: z.string().min(1),
});

export async function postSelectSupplier(req: Request, res: Response, next: NextFunction) {
  const fieldId = req.params.id;
  if (!fieldId) {
    res.status(400).json({ error: 'field id is required' });
    return;
  }
  const { itemKey, supplierId } = req.body as z.infer<typeof selectSupplierSchema>;
  try {
    const { selection } = await selectSupplierForField(fieldId, itemKey, supplierId);

    const conversation = (await ConversationModel.getForField(fieldId)) ?? (await ConversationModel.create(fieldId));
    const ctx: ToolCtx = { conversationId: conversation.id, messageId: null, fieldId, stream: createNoopStream() };
    await getRegistry().get('compute_financials')!.handler({}, ctx);

    res.status(201).json({ selection });
  } catch (err) {
    if (err instanceof Error && (err.message.startsWith('unknown supplier') || err.message.includes('does not currently stock') || err.message.startsWith('no active crop cycle'))) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
}
