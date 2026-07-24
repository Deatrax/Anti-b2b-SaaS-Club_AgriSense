// middleware/trace.middleware.ts — request-level correlation (§C.3 "WRITE THIS FIRST").
// The PER-TOOL trace lives in tools/registry.ts; this ties an HTTP request to its conversation.
import type { Request, Response, NextFunction } from 'express';

export function traceMiddleware(_req: Request, res: Response, next: NextFunction): void {
  // TODO: attach a request id + conversation id to res.locals for correlated logging.
  void res;
  next();
}
