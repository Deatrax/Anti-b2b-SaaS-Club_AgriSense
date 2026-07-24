// lib/sse.ts — consume the chat SSE stream (§C.1). Parses StreamEvent frames.
import type { StreamEvent } from '@agrisense/shared';

export function openChatStream(_body: unknown, _onEvent: (e: StreamEvent) => void): () => void {
  // TODO: fetch POST /api/chat; read the ReadableStream; parse `data:` frames → onEvent.
  return () => {};
}
