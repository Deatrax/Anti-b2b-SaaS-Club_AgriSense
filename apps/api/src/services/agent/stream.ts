// agent/stream.ts — SSE emitter bound to the HTTP response (§C.7). One event per tool lifecycle.
// NEVER a bare spinner: name the tool + its input while running.
import type { StreamEvent, TraceEntry } from '@agrisense/shared';

export interface AgentStream {
  text(delta: string): void;
  toolStart(trace: unknown): void;
  toolEnd(trace: unknown, result: unknown, status: string): void;
  notice(message: string): void;
  done(): void;
}

/**
 * A dumb adapter: each call becomes exactly one StreamEvent handed to `emit`.
 * `emit` owns the actual `data: <json>\n\n` write — callers bind it to the
 * Express response so this module never touches `Response` directly.
 * `toolStart`/`toolEnd` are called by the registry's trace wrapper (§C.7)
 * with an already-complete `TraceEntry`; `result`/`status` on `toolEnd`
 * mirror what `trace` already carries and aren't needed again here.
 */
export function createSseStream(emit: (event: StreamEvent) => void): AgentStream {
  return {
    text(delta) {
      emit({ type: 'text', delta });
    },
    toolStart(trace) {
      emit({ type: 'tool_start', trace: trace as TraceEntry });
    },
    toolEnd(trace, _result, _status) {
      emit({ type: 'tool_end', trace: trace as TraceEntry });
    },
    notice(message) {
      emit({ type: 'notice', message });
    },
    done() {
      emit({ type: 'done' });
    },
  };
}
