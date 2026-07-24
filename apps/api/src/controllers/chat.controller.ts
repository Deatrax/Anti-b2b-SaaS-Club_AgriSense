// C — chat SSE endpoint (§C.1 streaming). Streams agent text + tool events as text/event-stream.
import type { Request, Response } from 'express';

export async function postChat(req: Request, res: Response) {
  // TODO: set SSE headers; build AgentContext (field, conversation, stream bound to res);
  //       call services/agent/orchestrator.runAgent(ctx, message); end on 'done'.
  res.status(501).json({ error: 'not implemented' });
}
