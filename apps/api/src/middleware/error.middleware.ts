// middleware/error.middleware.ts — central error handler. Never leak stack traces to the client.
import type { Request, Response, NextFunction } from 'express';

export function errorMiddleware(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  console.error(err);
  res.status(500).json({ error: 'internal_error' });
}
