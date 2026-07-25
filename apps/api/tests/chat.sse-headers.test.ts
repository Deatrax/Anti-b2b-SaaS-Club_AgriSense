// chat.controller SSE response headers — regression guard for the streaming-through-proxy
// bug: the Next.js /api rewrite gzip-compresses responses when the browser advertises
// Accept-Encoding, and the compressor buffers the ENTIRE event stream until close. The
// farmer saw no tokens or tool events until the turn ended (or, after navigating away, only
// the persisted reply from history). `Cache-Control: no-transform` is what stops the proxy
// from compressing — if someone "simplifies" it back to plain no-cache, this fails.
import { describe, it, expect, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

vi.mock('../src/config/llm', () => ({
  primaryModel: () => ({}) as never,
  failoverModel: () => null,
}));
vi.mock('../src/models/field.model', () => ({
  FieldModel: { getState: vi.fn(async () => ({ identity: { id: 'f1' }, activeCycle: null, missingFields: [] })) },
}));
vi.mock('../src/models/conversation.model', () => ({
  ConversationModel: { getForField: vi.fn(async () => ({ id: 'conv-1' })), getById: vi.fn(), create: vi.fn() },
}));
vi.mock('../src/services/agent/orchestrator', () => ({ runAgent: vi.fn(async () => undefined) }));

const { postChat } = await import('../src/controllers/chat.controller');

describe('postChat SSE headers', () => {
  it('sets no-transform so the Next rewrite proxy cannot buffer the stream via gzip', async () => {
    const headers: Record<string, string> = {};
    const res = {
      setHeader: (k: string, v: string) => {
        headers[k.toLowerCase()] = v;
      },
      flushHeaders: vi.fn(),
      write: vi.fn(),
      end: vi.fn(),
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as unknown as Response;
    const req = { body: { fieldId: 'f1', message: 'hello' } } as Request;

    await postChat(req, res, vi.fn() as NextFunction);

    expect(headers['content-type']).toBe('text/event-stream');
    expect(headers['cache-control']).toContain('no-transform');
  });
});
