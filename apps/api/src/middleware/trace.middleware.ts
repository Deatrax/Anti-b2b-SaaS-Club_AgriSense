// middleware/trace.middleware.ts — request-level correlation (§C.3 "WRITE THIS FIRST").
// The PER-TOOL trace lives in tools/registry.ts; this ties an HTTP request to its conversation.
import { randomUUID } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';

export function traceMiddleware(req: Request, res: Response, next: NextFunction): void {
  const requestId = randomUUID();
  const conversationId = extractConversationId(req);
  res.locals.requestId = requestId;
  res.locals.conversationId = conversationId;
  console.log(
    `[${requestId}] ${req.method} ${req.originalUrl}${conversationId ? ` conv=${conversationId}` : ''}`,
  );
  next();
}

function extractConversationId(req: Request): string | null {
  const value = (req.body as Record<string, unknown> | undefined)?.conversationId;
  return typeof value === 'string' ? value : null;
}
