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
  fieldId: z.string().min(1),
  message: z.string().min(1),
});

export function selectModel(): LanguageModel {
  try {
    return primaryModel();
  } catch (err) {
    const fallback = failoverModel();
    if (!fallback) throw err;
    return fallback;
  }
}

export async function postChat(req: Request, res: Response, next: NextFunction) {
  const { fieldId, message } = req.body as z.infer<typeof postChatSchema>;

  let model: LanguageModel;
  try {
    model = selectModel();
  } catch (err) {
    next(err);
    return;
  }

  const conversation = (await ConversationModel.getForField(fieldId)) ?? (await ConversationModel.create(fieldId));

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
    fieldId,
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
