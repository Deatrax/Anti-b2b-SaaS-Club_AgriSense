// app.ts — Express app assembly (§C.3). Mounts /api routes + middleware.
import express from 'express';
import cors from 'cors';
import { router } from './routes/index';
import { traceMiddleware } from './middleware/trace.middleware';
import { errorMiddleware } from './middleware/error.middleware';
import { registerAllTools } from './services/tools/index';

export function createApp() {
  registerAllTools();
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(traceMiddleware);
  app.get('/health', (_req, res) => res.json({ ok: true }));
  app.use('/api', router);
  app.use(errorMiddleware);
  return app;
}
