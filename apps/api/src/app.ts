// app.ts — Express app assembly (§C.3). Mounts /api routes + middleware.
import express from 'express';
import cors from 'cors';
import { router } from './routes/index';
import { traceMiddleware } from './middleware/trace.middleware';
import { errorMiddleware } from './middleware/error.middleware';
import { validate } from './middleware/validate.middleware';
import { requireWebhookSecret } from './middleware/webhookAuth.middleware';
import { registerAllTools } from './services/tools/index';
import { postAgentSms, postAgentSmsSchema } from './controllers/sms.controller';

export function createApp() {
  registerAllTools();
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(traceMiddleware);
  app.get('/health', (_req, res) => res.json({ ok: true }));
  // Mounted at root (not /api): the Plan B CONTRACT fixes this path as
  // POST {AGENT_BASE_URL}/agent/sms — a machine-to-machine webhook channel, not a
  // browser-facing API route.
  app.post('/agent/sms', requireWebhookSecret, validate(postAgentSmsSchema), postAgentSms);
  app.use('/api', router);
  app.use(errorMiddleware);
  return app;
}
