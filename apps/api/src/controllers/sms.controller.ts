// controllers/sms.controller.ts — POST /agent/sms (Plan B CONTRACT, frozen, shared with the
// farmer-sms-webhook repo/Plan A). A thin channel adapter, not the /chat endpoint: see
// services/channels/sms.channel.ts for why this bypasses the full agent loop.
import type { Request, Response } from 'express';
import { z } from 'zod';
import { answerSms } from '../services/channels/sms.channel';

export const postAgentSmsSchema = z.object({
  msisdn: z.string().min(6),
  message: z.string().min(1),
  requestId: z.string().min(1),
  lang: z.string().optional(),
  subscribed: z.boolean().optional(),
});

// CONTRACT's hard budget is 8s; the webhook itself times out ~8-10s and replaces a late
// answer with its own holding SMS, so a late reply here is wasted work either way. Race a
// deadline that leaves margin for the HTTP round trip back to the webhook — a fast, honest
// error beats a slow one, and the still-running computation populates the idempotency cache
// for a same-requestId retry even after this response has gone out.
const DEADLINE_MS = 7000;

export async function postAgentSms(req: Request, res: Response) {
  const { msisdn, message, requestId } = req.body as z.infer<typeof postAgentSmsSchema>;

  const deadline = new Promise<{ reply: string; status: 'error' }>((resolve) => {
    setTimeout(() => resolve({ reply: '', status: 'error' }), DEADLINE_MS);
  });

  const result = await Promise.race([answerSms({ msisdn, message, requestId }), deadline]);
  res.json(result);
}
