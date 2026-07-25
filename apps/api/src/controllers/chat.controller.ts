// C — chat SSE endpoint (§C.1 streaming). Streams agent text + tool events as text/event-stream.
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import type { LanguageModel } from 'ai';
import type { StreamEvent } from '@agrisense/shared';
import { runAgent, type AgentContext } from '../services/agent/orchestrator';
import { createSseStream } from '../services/agent/stream';
import { ConversationModel } from '../models/conversation.model';
import { FieldModel } from '../models/field.model';
import { primaryModel, failoverModel } from '../config/llm';

export const postChatSchema = z.object({
  fieldId: z.string().min(1),
  message: z.string().min(1).max(2000),
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
  const { fieldId, message, conversationId } = req.body as z.infer<typeof postChatSchema>;

  let model: LanguageModel;
  try {
    model = selectModel();
  } catch (err) {
    next(err);
    return;
  }

  // Everything before flushHeaders() must resolve to a proper HTTP status: Express 4 does
  // not catch async throws, so an unhandled rejection here would HANG the request — observed
  // with an unknown fieldId (conversation insert hits the FK and nothing answers the client).
  let conversation: { id: string };
  try {
    await FieldModel.getState(fieldId); // throws "not found" for an unknown field
    if (conversationId) {
      const existing = await ConversationModel.getById(conversationId);
      if (!existing || existing.fieldId !== fieldId) {
        res.status(404).json({ error: 'conversation not found for this field' });
        return;
      }
      conversation = existing;
    } else {
      conversation = (await ConversationModel.getForField(fieldId)) ?? (await ConversationModel.create(fieldId));
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes('not found')) {
      res.status(404).json({ error: err.message });
      return;
    }
    next(err);
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  // `no-transform` is LOAD-BEARING: the Next.js /api rewrite proxy gzip-compresses responses
  // when the browser sends Accept-Encoding, and the compressor buffers the WHOLE SSE stream
  // until the response closes — the farmer saw no tokens, no tool events, nothing until the
  // turn ended (measured: 24 incremental chunks without gzip → 1 close-time chunk with it).
  // no-transform tells the proxy to leave the stream alone so events flow as written.
  res.setHeader('Cache-Control', 'no-cache, no-transform');
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
