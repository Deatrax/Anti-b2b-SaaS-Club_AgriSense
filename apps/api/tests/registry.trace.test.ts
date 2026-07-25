// registry.trace.test.ts — the trace wrapper is Tier-0 #8's evidence store (§C.7).
// Verifies: every call opens/closes a trace row, streams start/end, and the three
// exit paths (ok/error/fallback) behave exactly as the registry contract promises.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ToolResult } from '@agrisense/shared';
import type { ToolCtx } from '../src/services/tools/registry';

// Step is now allocated by TraceModel.begin (the DB's coalesce(max(step))+1), NOT by an
// in-memory counter in the registry — so a process restart can't reset it (BUG-9c). This mock
// stands in for the DB's per-conversation sequence.
const stepSeq = new Map<string, number>();
const begin = vi.fn(async (conversationId: string, _m: string | null, _tool: string, _toolClass: string, _params: unknown) => {
  const step = (stepSeq.get(conversationId) ?? 0) + 1;
  stepSeq.set(conversationId, step);
  return { id: `trace-${step}`, step, startedAt: Date.now() };
});
const ok = vi.fn(async (_h: unknown, _result: unknown, _source: string | null, _durationMs: number) => undefined);
const error = vi.fn(async (_h: unknown, _err: unknown, _durationMs: number) => undefined);
const fallback = vi.fn(async (_h: unknown, _result: unknown, _err: unknown, _durationMs: number) => undefined);

vi.mock('../src/models/trace.model', () => ({
  TraceModel: { begin, ok, error, fallback },
}));

const { register, getRegistry } = await import('../src/services/tools/registry');

function makeCtx(conversationId = 'conv-1'): ToolCtx {
  return {
    conversationId,
    messageId: null,
    fieldId: 'field-1',
    stream: { text: vi.fn(), toolStart: vi.fn(), toolEnd: vi.fn(), notice: vi.fn(), done: vi.fn() },
  };
}

const okResult: ToolResult<{ ok: true }> = {
  data: { ok: true },
  provenance: [{ source: 'Test Source', method: 'computed', retrievedAt: new Date().toISOString() }],
};

beforeEach(() => {
  vi.clearAllMocks();
  getRegistry().clear();
  stepSeq.clear();
});

describe('registry trace wrapper', () => {
  it('ok path: begins, streams start+end(ok), records result+source, returns data', async () => {
    register({
      name: 'echo_ok',
      description: 'test',
      schema: { parse: (v: unknown) => v } as never,
      toolClass: 'deterministic',
      phases: ['PLANNING'],
      handler: async () => okResult,
    });
    const ctx = makeCtx();
    const out = await getRegistry().get('echo_ok')!.handler(undefined, ctx);

    expect(out).toBe(okResult);
    expect(begin).toHaveBeenCalledWith('conv-1', null, 'echo_ok', 'deterministic', undefined);
    expect(ok).toHaveBeenCalledWith(expect.objectContaining({ id: 'trace-1' }), okResult, 'Test Source', expect.any(Number));
    expect(ctx.stream.toolStart).toHaveBeenCalledWith(expect.objectContaining({ status: 'running', tool: 'echo_ok' }));
    expect(ctx.stream.toolEnd).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'ok', result: okResult, source: 'Test Source' }),
      okResult,
      'ok',
    );
  });

  it('error path (no fallback): records error, streams end(error), rethrows', async () => {
    const boom = new Error('boom');
    register({
      name: 'echo_error',
      description: 'test',
      schema: { parse: (v: unknown) => v } as never,
      toolClass: 'external',
      phases: ['PLANNING'],
      handler: async () => {
        throw boom;
      },
    });
    const ctx = makeCtx('conv-error');

    await expect(getRegistry().get('echo_error')!.handler(undefined, ctx)).rejects.toThrow('boom');
    expect(error).toHaveBeenCalledWith(expect.objectContaining({ id: 'trace-1' }), boom, expect.any(Number));
    expect(ctx.stream.toolEnd).toHaveBeenCalledWith(expect.objectContaining({ status: 'error' }), { error: String(boom) }, 'error');
  });

  it('fallback path: swallows the error, streams end(fallback), returns fallback data', async () => {
    const fbResult: ToolResult<{ cached: true }> = {
      data: { cached: true },
      provenance: [{ source: 'Cache', method: 'memory', retrievedAt: new Date().toISOString() }],
    };
    register({
      name: 'echo_fallback',
      description: 'test',
      schema: { parse: (v: unknown) => v } as never,
      toolClass: 'external',
      phases: ['PLANNING'],
      handler: async () => {
        throw new Error('timed out');
      },
      fallback: () => fbResult,
    });
    const ctx = makeCtx('conv-fallback');

    const out = await getRegistry().get('echo_fallback')!.handler(undefined, ctx);
    expect(out).toBe(fbResult);
    expect(fallback).toHaveBeenCalledWith(expect.objectContaining({ id: 'trace-1' }), fbResult, expect.any(Error), expect.any(Number));
    expect(ctx.stream.toolEnd).toHaveBeenCalledWith(expect.objectContaining({ status: 'fallback', source: 'Cache' }), fbResult, 'fallback');
  });

  it('times out a hanging handler and still resolves via the fallback path', async () => {
    const fbResult: ToolResult<null> = { data: null, provenance: [] };
    register({
      name: 'echo_hang',
      description: 'test',
      schema: { parse: (v: unknown) => v } as never,
      toolClass: 'external',
      phases: ['PLANNING'],
      timeoutMs: 20,
      handler: () => new Promise<ToolResult<null>>(() => {}),
      fallback: () => fbResult,
    });
    const ctx = makeCtx();

    const out = await getRegistry().get('echo_hang')!.handler(undefined, ctx);
    expect(out).toBe(fbResult);
    expect(fallback.mock.calls[0]![2]).toBeInstanceOf(Error);
  });

  it('uses the DB-allocated step (from begin) on the streamed trace entry, per conversation', async () => {
    register({
      name: 'echo_step',
      description: 'test',
      schema: { parse: (v: unknown) => v } as never,
      toolClass: 'deterministic',
      phases: ['PLANNING'],
      handler: async () => okResult,
    });
    const ctxA = makeCtx('conv-A');
    const ctxB = makeCtx('conv-B');

    await getRegistry().get('echo_step')!.handler(undefined, ctxA);
    await getRegistry().get('echo_step')!.handler(undefined, ctxB);
    await getRegistry().get('echo_step')!.handler(undefined, ctxA);

    // begin is called WITHOUT a step arg — the DB allocates it. The registry must thread the
    // returned step onto the trace entry it streams, per conversation.
    expect(begin).toHaveBeenNthCalledWith(1, 'conv-A', null, 'echo_step', 'deterministic', undefined);
    expect(begin).toHaveBeenNthCalledWith(2, 'conv-B', null, 'echo_step', 'deterministic', undefined);
    expect(begin).toHaveBeenNthCalledWith(3, 'conv-A', null, 'echo_step', 'deterministic', undefined);
    expect((ctxA.stream.toolStart as ReturnType<typeof vi.fn>).mock.calls[0]![0]).toMatchObject({ step: 1 });
    expect((ctxB.stream.toolStart as ReturnType<typeof vi.fn>).mock.calls[0]![0]).toMatchObject({ step: 1 });
    expect((ctxA.stream.toolStart as ReturnType<typeof vi.fn>).mock.calls[1]![0]).toMatchObject({ step: 2 });
  });
});
