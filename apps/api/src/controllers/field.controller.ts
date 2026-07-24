// C — fields. Read the workspace state; the dashboard cards render from this.
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { FieldModel } from '../models/field.model';
import { PlanEventModel } from '../models/planEvent.model';
import { SeasonPlanModel } from '../models/seasonPlan.model';
import { LedgerModel } from '../models/ledger.model';
import { RiskWindowModel } from '../models/riskWindow.model';
import { ConversationModel } from '../models/conversation.model';
import { TraceModel } from '../models/trace.model';
import { serializeField } from '../views/field.view';
import { serializePlan } from '../views/plan.view';
import { serializeFinancial } from '../views/financial.view';

function isNotFound(err: unknown): err is Error {
  return err instanceof Error && err.message.includes('not found');
}

export const createFieldSchema = z.object({
  farmId: z.string().min(1),
  name: z.string().min(1).optional(),
});

/** The conversational-intake opener (Tier 0 #1) — a fixed template, not an LLM call: the
 * greeting carries no numbers, and seeding it here means the farmer lands in a chat the
 * agent has already started, instead of a blank composer. The agent takes over from the
 * first reply (GATHERING phase asks for the remaining fields two at a time). */
const INTAKE_GREETING =
  "I'll set up this field and build you a full plan — crop, calendar and costs. " +
  'First: which district is the land in?\n\n' +
  'আমি এই জমির জন্য একটি সম্পূর্ণ পরিকল্পনা তৈরি করব — ফসল, সময়সূচি ও খরচ। প্রথমে বলুন, জমিটি কোন জেলায়?';

export async function createField(req: Request, res: Response, next: NextFunction) {
  const { farmId, name } = req.body as z.infer<typeof createFieldSchema>;
  try {
    const identity = await FieldModel.create(farmId, name);
    const conversation = await ConversationModel.create(identity.id);
    await ConversationModel.addMessage(conversation.id, 'assistant', INTAKE_GREETING);
    res.status(201).json({ field: identity, conversationId: conversation.id });
  } catch (err) {
    next(err);
  }
}

export async function getField(req: Request, res: Response, next: NextFunction) {
  const id = req.params.id;
  if (!id) {
    res.status(400).json({ error: 'field id is required' });
    return;
  }
  try {
    const state = await FieldModel.getState(id);
    res.json(serializeField(state));
  } catch (err) {
    if (isNotFound(err)) {
      res.status(404).json({ error: err.message });
      return;
    }
    next(err);
  }
}

/** A field's default chat history — its most recently started conversation — for callers
 * that don't pick a specific thread (embedded Overview/Plan panels, the Chat tab's first
 * load). Opening an existing field's chat needs this to show what was already said, not
 * start blank. */
export async function getFieldChatHistory(req: Request, res: Response, next: NextFunction) {
  const id = req.params.id;
  if (!id) {
    res.status(400).json({ error: 'field id is required' });
    return;
  }
  try {
    const conversation = await ConversationModel.getForField(id);
    if (!conversation) {
      res.json({ conversationId: null, messages: [], traces: [] });
      return;
    }
    const [messages, traces] = await Promise.all([
      ConversationModel.recentMessages(conversation.id, 200),
      TraceModel.listByConversation(conversation.id),
    ]);
    res.json({ conversationId: conversation.id, messages, traces });
  } catch (err) {
    next(err);
  }
}

/** "New chat" (§ multi-chat) — a field can hold many conversations; this explicitly starts
 * a fresh one instead of reusing the most recent (that's what getForField is for). */
export async function createFieldConversation(req: Request, res: Response, next: NextFunction) {
  const fieldId = req.params.id;
  if (!fieldId) {
    res.status(400).json({ error: 'field id is required' });
    return;
  }
  try {
    const conversation = await ConversationModel.create(fieldId);
    res.status(201).json({ conversation });
  } catch (err) {
    next(err);
  }
}

export async function getFieldPlan(req: Request, res: Response, next: NextFunction) {
  const id = req.params.id;
  if (!id) {
    res.status(400).json({ error: 'field id is required' });
    return;
  }
  try {
    const state = await FieldModel.getState(id);
    const cycle = state.activeCycle;
    if (!cycle) {
      res.json({ plan: null, financial: serializeFinancial([]), risk: [] });
      return;
    }
    const [events, meta, ledgerEntries, riskWindows] = await Promise.all([
      PlanEventModel.listByCycle(cycle.id),
      SeasonPlanModel.getLatestForCycle(cycle.id),
      LedgerModel.listByCycle(cycle.id),
      RiskWindowModel.listByCycle(cycle.id),
    ]);
    const plan = meta ? { ...meta, events } : null;
    res.json({
      plan: serializePlan(plan),
      financial: serializeFinancial(ledgerEntries),
      risk: riskWindows,
    });
  } catch (err) {
    if (isNotFound(err)) {
      res.status(404).json({ error: err.message });
      return;
    }
    next(err);
  }
}
