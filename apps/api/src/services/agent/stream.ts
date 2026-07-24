// agent/stream.ts — SSE emitter bound to the HTTP response (§C.7). One event per tool lifecycle.
// NEVER a bare spinner: name the tool + its input while running.
import type { StreamEvent } from '@agrisense/shared';

export interface AgentStream {
  text(delta: string): void;
  toolStart(trace: unknown): void;
  toolEnd(trace: unknown, result: unknown, status: string): void;
  notice(message: string): void;
  done(): void;
}

export function createSseStream(_emit: (event: StreamEvent) => void): AgentStream {
  // TODO: adapt each call into a `data: <json>\n\n` write on the Express response.
  throw new Error('createSseStream not implemented');
}
