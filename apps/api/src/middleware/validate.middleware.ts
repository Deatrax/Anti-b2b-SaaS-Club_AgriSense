// middleware/validate.middleware.ts — Zod body validation (§C.1 "runtime validation free").
import type { Request, Response, NextFunction } from 'express';
import type { z } from 'zod';

export function validate(schema: z.ZodType) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'invalid_request', issues: parsed.error.issues });
      return;
    }
    req.body = parsed.data;
    next();
  };
}
