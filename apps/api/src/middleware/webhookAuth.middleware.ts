// middleware/webhookAuth.middleware.ts — gates /agent/sms (Plan B CONTRACT): only the
// farmer-sms-webhook repo (Plan A) may call it, authenticated by a shared secret header.
// Fails closed: an unconfigured secret rejects every request rather than accepting them.
import type { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';

export function requireWebhookSecret(req: Request, res: Response, next: NextFunction): void {
  const provided = req.header('X-Webhook-Secret');
  if (!env.AGENT_WEBHOOK_SECRET || provided !== env.AGENT_WEBHOOK_SECRET) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }
  next();
}
