// C — chat SSE endpoint (§C.1 streaming). Streams agent text + tool events as text/event-stream.
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import type { LanguageModel } from 'ai';
import type { StreamEvent } from '@agrisense/shared';
import { runAgent, type AgentContext } from '../services/agent/orchestrator';
import { createSseStream } from '../services/agent/stream';
import { ConversationModel } from '../models/conversation.model';
import { primaryModel, failoverModel } from '../config/llm';

export const postChatSchema = z.object({
  farmId: z.string().min(1),
  fieldId: z.string().min(1).optional(),
  message: z.string().min(1),
  /** A field can have several conversations (§ multi-chat). Omit to continue/create the
   * field's default (most recent) thread; pass the id from a "recent chats" entry to reply
   * in that exact one instead. */
  conversationId: z.string().min(1).optional(),
});

function selectModel(): LanguageModel {
  try {
    return primaryModel();
  } catch (err) {
    const fallback = failoverModel();
    if (!fallback) throw err;
    return fallback;
  }
}

export async function postChat(req: Request, res: Response, next: NextFunction) {
  const { farmId, fieldId, message, conversationId } = req.body as z.infer<typeof postChatSchema>;

  let model: LanguageModel;
  try {
    model = selectModel();
  } catch (err) {
    next(err);
    return;
  }

  let conversation: { id: string };
  if (conversationId) {
    const existing = await ConversationModel.getById(conversationId);
    if (!existing || existing.farmId !== farmId) {
      res.status(404).json({ error: 'conversation not found for this farm' });
      return;
    }
    conversation = existing;
  } else {
    // If fieldId is provided, get the field's default conversation, otherwise create a new general one.
    conversation = fieldId 
      ? ((await ConversationModel.getForField(fieldId)) ?? (await ConversationModel.create(farmId, fieldId)))
      : (await ConversationModel.create(farmId));
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const stream = createSseStream((event: StreamEvent) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  });

  const ctx: AgentContext = {
    conversationId: conversation.id,
    messageId: null,
    farmId,
    fieldId: fieldId ?? conversation.fieldId ?? undefined,
    stream,
    model,
  };

  try {
    await runAgent(ctx, message);
  } catch (err) {
    stream.notice(`⚠ Something went wrong (${String(err)}) — please try again.`);
    stream.done();
  } finally {
    res.end();
  }
}
