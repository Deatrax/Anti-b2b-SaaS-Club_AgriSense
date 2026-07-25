// lib/sse.ts — consume the chat SSE stream (§C.1). Parses StreamEvent frames written by
// apps/api's chat.controller.ts (`data: <json>\n\n` per event).
import type { StreamEvent } from '@agrisense/shared';

/** POSTs to /api/chat and streams events as they arrive. Returns an abort function. */
export function openChatStream(
  body: { fieldId: string; message: string; conversationId?: string },
  onEvent: (e: StreamEvent) => void,
): () => void {
  const controller = new AbortController();
  // The composer is disabled while `isStreaming` is true, and only a `done` event clears it.
  // If the connection closes without one (server crash, proxy timeout, process restart mid-turn)
  // the farmer is locked out of the chat with no way back except a reload. Track whether the
  // server sent `done` and synthesize one on exit if it didn't.
  let sawDone = false;
  const deliver = (e: StreamEvent) => {
    if (e.type === 'done') sawDone = true;
    onEvent(e);
  };
  const finish = () => {
    if (!sawDone && !controller.signal.aborted) deliver({ type: 'done' });
  };

  (async () => {
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        deliver({ type: 'notice', message: `⚠ Chat request failed (${res.status}).` });
        deliver({ type: 'done' });
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const frames = buffer.split('\n\n');
        buffer = frames.pop() ?? '';
        for (const frame of frames) {
          const dataLine = frame.split('\n').find((line) => line.startsWith('data: '));
          if (!dataLine) continue;
          try {
            deliver(JSON.parse(dataLine.slice('data: '.length)) as StreamEvent);
          } catch {
            // malformed frame — skip rather than crash the stream
          }
        }
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      deliver({ type: 'notice', message: `⚠ Connection lost (${String(err)}).` });
      deliver({ type: 'done' });
    } finally {
      finish();
    }
  })();

  return () => controller.abort();
}
