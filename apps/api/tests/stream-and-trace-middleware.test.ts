// stream-and-trace-middleware.test.ts — smoke coverage for the two remaining Phase 1
// files: the SSE adapter (stream.ts) and the request-correlation middleware.
import { describe, it, expect, vi } from 'vitest';
import type { Request, Response } from 'express';
import { createSseStream } from '../src/services/agent/stream';
import { traceMiddleware } from '../src/middleware/trace.middleware';

describe('createSseStream', () => {
  it('maps each AgentStream call to exactly one StreamEvent', () => {
    const events: unknown[] = [];
    const stream = createSseStream((e) => events.push(e));

    stream.text('hello');
    stream.toolStart({ id: 't1' });
    stream.toolEnd({ id: 't1', status: 'ok' }, { data: 1 }, 'ok');
    stream.notice('heads up');
    stream.done();

    expect(events).toEqual([
      { type: 'text', delta: 'hello' },
      { type: 'tool_start', trace: { id: 't1' } },
      { type: 'tool_end', trace: { id: 't1', status: 'ok' } },
      { type: 'notice', message: 'heads up' },
      { type: 'done' },
    ]);
  });
});

describe('traceMiddleware', () => {
  function makeReqRes(body?: unknown) {
    const req = { method: 'POST', originalUrl: '/api/chat', body } as unknown as Request;
    const res = { locals: {} } as Response;
    const next = vi.fn();
    return { req, res, next };
  }

  it('attaches a fresh requestId and null conversationId when absent', () => {
    const { req, res, next } = makeReqRes({});
    traceMiddleware(req, res, next);

    expect(typeof res.locals.requestId).toBe('string');
    expect(res.locals.requestId.length).toBeGreaterThan(0);
    expect(res.locals.conversationId).toBeNull();
    expect(next).toHaveBeenCalledOnce();
  });

  it('picks up conversationId from the request body', () => {
    const { req, res, next } = makeReqRes({ conversationId: 'conv-42' });
    traceMiddleware(req, res, next);

    expect(res.locals.conversationId).toBe('conv-42');
    expect(next).toHaveBeenCalledOnce();
  });

  it('gives two requests distinct requestIds', () => {
    const first = makeReqRes({});
    const second = makeReqRes({});
    traceMiddleware(first.req, first.res, first.next);
    traceMiddleware(second.req, second.res, second.next);

    expect(first.res.locals.requestId).not.toBe(second.res.locals.requestId);
  });
});
