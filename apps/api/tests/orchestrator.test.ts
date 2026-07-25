// orchestrator.test.ts — the hand-rolled tool loop (§C.2). streamText is mocked so each test
// scripts exactly what the model does across steps; the tool registry and trace wrapper are
// real, so a tool call in these tests exercises the actual §C.7 trace-open/close path.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { FieldState } from '@agrisense/shared';

const streamText = vi.fn();
vi.mock('ai', () => ({ streamText, tool: (t: unknown) => t }));

const getState = vi.fn();
vi.mock('../src/models/field.model', () => ({ FieldModel: { getState } }));

const recentMessages = vi.fn();
const recentMessagesForFieldExcluding = vi.fn();
const addMessage = vi.fn(async () => ({ id: 'msg-1' }));
vi.mock('../src/models/conversation.model', () => ({
  ConversationModel: { recentMessages, recentMessagesForFieldExcluding, addMessage },
}));

vi.mock('../src/models/trace.model', () => ({
  TraceModel: {
    begin: vi.fn(async (_c: string, _m: string | null, step: number) => ({ id: `t${step}`, step, startedAt: Date.now() })),
    ok: vi.fn(async () => undefined),
    error: vi.fn(async () => undefined),
    fallback: vi.fn(async () => undefined),
  },
}));

const { runAgent } = await import('../src/services/agent/orchestrator');
const { register, getRegistry } = await import('../src/services/tools/registry');

const maintainingState: FieldState = {
  identity: {
    id: 'f1', farmId: 'farm1', name: 'Field', areaHa: 0.4, soilType: 'loam',
    waterSource: 'shallow_tubewell', lat: 24.7, lon: 90.4, budgetBdt: 40000,
  },
  missingFields: [],
  targetSeason: 'aman',
  activeCycle: {
    id: 'c1', fieldId: 'f1', crop: 'aman_rice', variety: null, season: 'aman',
    sowingDate: null, expectedHarvest: null, status: 'active', stage: 'tillering',
    dayIndex: 20, actualYieldKg: null,
  },
};

function makeCtx() {
  return {
    conversationId: 'conv-1',
    messageId: null,
    fieldId: 'f1',
    model: {} as never,
    stream: { text: vi.fn(), toolStart: vi.fn(), toolEnd: vi.fn(), notice: vi.fn(), done: vi.fn() },
  };
}

/** Builds a mock streamText result: textStream yields the text once, the promise-shaped
 * fields resolve to the scripted values — the shape orchestrator.ts actually consumes. */
function streamResult(text: string, toolCalls: unknown[] = [], responseMessages?: unknown[]) {
  return {
    textStream: (async function* () {
      if (text) yield text;
    })(),
    toolCalls: Promise.resolve(toolCalls),
    responseMessages: Promise.resolve(responseMessages ?? (text ? [{ id: 'm', role: 'assistant', content: text }] : [])),
  };
}

function textOnlyResult(text: string) {
  return streamResult(text);
}

// streamText's `messages` argument is the SAME array the orchestrator keeps mutating in
// place across steps — inspecting `mock.calls[n][0].messages` after the run completes sees
// later mutations too. Snapshot it at call time instead via mockImplementationOnce.
function snapshotMessagesOnCall(result: unknown) {
  const box: { messages: unknown[] } = { messages: [] };
  const impl = (opts: { messages: unknown[] }) => {
    box.messages = [...opts.messages];
    return result;
  };
  return { impl, box };
}

beforeEach(() => {
  vi.clearAllMocks();
  getRegistry().clear();
  getState.mockResolvedValue(maintainingState);
  recentMessages.mockResolvedValue([]);
  recentMessagesForFieldExcluding.mockResolvedValue([]);
});

describe('runAgent — no tool calls', () => {
  it('persists both turns, streams the text, and ends the stream', async () => {
    streamText.mockReturnValueOnce(textOnlyResult('Hello farmer'));
    const ctx = makeCtx();

    await runAgent(ctx, 'hi');

    expect(addMessage).toHaveBeenNthCalledWith(1, 'conv-1', 'user', 'hi');
    expect(addMessage).toHaveBeenNthCalledWith(2, 'conv-1', 'assistant', 'Hello farmer', undefined);
    expect(ctx.stream.text).toHaveBeenCalledWith('Hello farmer');
    expect(ctx.stream.done).toHaveBeenCalledOnce();
    expect(streamText).toHaveBeenCalledTimes(1);
  });

  it('feeds prior user/assistant history into the messages array', async () => {
    recentMessages.mockResolvedValue([
      { id: 'h1', conversationId: 'conv-1', role: 'user', content: 'earlier question', toolCalls: null, isProactive: false, createdAt: '' },
      { id: 'h2', conversationId: 'conv-1', role: 'assistant', content: 'earlier answer', toolCalls: null, isProactive: false, createdAt: '' },
    ]);
    const { impl, box } = snapshotMessagesOnCall(textOnlyResult('follow-up answer'));
    streamText.mockImplementationOnce(impl);

    await runAgent(makeCtx(), 'follow-up question');

    expect(box.messages).toEqual([
      { role: 'user', content: 'earlier question' },
      { role: 'assistant', content: 'earlier answer' },
      { role: 'user', content: 'follow-up question' },
    ]);
  });
});

describe('runAgent — tool calling', () => {
  it('invokes the real trace-wrapped tool handler, feeds the result back, then finishes', async () => {
    const handler = vi.fn(async () => ({ data: { ok: true }, provenance: [{ source: 'Test', method: 'computed' as const, retrievedAt: 'now' }] }));
    register({
      name: 'get_field_state',
      description: 'test',
      schema: { parse: (v: unknown) => v } as never,
      toolClass: 'field',
      phases: ['MAINTAINING'],
      handler,
    });

    const { impl, box } = snapshotMessagesOnCall(textOnlyResult('Here is your field state.'));
    streamText
      .mockReturnValueOnce(
        streamResult('', [{ toolCallId: 'call-1', toolName: 'get_field_state', input: {} }], [
          { id: 'm1', role: 'assistant', content: [{ type: 'tool-call', toolCallId: 'call-1', toolName: 'get_field_state', input: {} }] },
        ]),
      )
      .mockImplementationOnce(impl);

    const ctx = makeCtx();
    await runAgent(ctx, 'what is my field state?');

    expect(handler).toHaveBeenCalledWith({}, ctx);
    expect(ctx.stream.toolStart).toHaveBeenCalledOnce();
    expect(ctx.stream.toolEnd).toHaveBeenCalledOnce();
    expect(streamText).toHaveBeenCalledTimes(2);

    const toolResultMessage = box.messages[box.messages.length - 1];
    expect(toolResultMessage).toEqual({
      role: 'tool',
      content: [
        {
          type: 'tool-result',
          toolCallId: 'call-1',
          toolName: 'get_field_state',
          output: { type: 'json', value: { data: { ok: true }, provenance: expect.any(Array) } },
        },
      ],
    });

    expect(addMessage).toHaveBeenLastCalledWith(
      'conv-1',
      'assistant',
      'Here is your field state.',
      [{ name: 'get_field_state', args: {} }],
    );
  });

  it('turns a hallucinated tool name into an error tool-result instead of crashing', async () => {
    const { impl, box } = snapshotMessagesOnCall(textOnlyResult('done'));
    streamText
      .mockReturnValueOnce(streamResult('', [{ toolCallId: 'call-1', toolName: 'does_not_exist', input: {} }], []))
      .mockImplementationOnce(impl);

    await runAgent(makeCtx(), 'go');

    const toolResultMessage = box.messages[box.messages.length - 1] as { content: unknown[] };
    expect(toolResultMessage.content[0]).toMatchObject({ output: { type: 'error-json', value: { error: expect.stringMatching(/unknown tool/) } } });
  });

  it('lets one tool handler throwing become an error result without crashing the turn', async () => {
    register({
      name: 'boom_tool',
      description: 'test',
      schema: { parse: (v: unknown) => v } as never,
      toolClass: 'field',
      phases: ['MAINTAINING'],
      handler: async () => {
        throw new Error('db unreachable');
      },
    });
    const { impl, box } = snapshotMessagesOnCall(textOnlyResult('recovered'));
    streamText
      .mockReturnValueOnce(streamResult('', [{ toolCallId: 'call-1', toolName: 'boom_tool', input: {} }], []))
      .mockImplementationOnce(impl);

    await runAgent(makeCtx(), 'go');

    const toolResultMessage = box.messages[box.messages.length - 1] as { content: unknown[] };
    expect(toolResultMessage.content[0]).toMatchObject({ output: { type: 'error-json', value: { error: expect.stringMatching(/db unreachable/) } } });
  });
});

describe('runAgent — resilience', () => {
  it('reaches the step cap gracefully instead of looping forever', async () => {
    register({
      name: 'looping_tool',
      description: 'test',
      schema: { parse: (v: unknown) => v } as never,
      toolClass: 'deterministic',
      phases: ['MAINTAINING'],
      handler: async () => ({ data: null, provenance: [] }),
    });
    // a fresh streamResult per call — an async generator can only be consumed once
    streamText.mockImplementation(() => streamResult('', [{ toolCallId: 'call-x', toolName: 'looping_tool', input: {} }], []));

    const ctx = makeCtx();
    await runAgent(ctx, 'keep going forever');

    expect(streamText).toHaveBeenCalledTimes(10);
    expect(ctx.stream.notice).toHaveBeenCalledWith(expect.stringMatching(/step limit/));
    expect(ctx.stream.done).toHaveBeenCalledOnce();
  });

  it('degrades gracefully when the model call itself fails', async () => {
    streamText.mockImplementationOnce(() => {
      throw new Error('ECONNRESET');
    });
    const ctx = makeCtx();

    await runAgent(ctx, 'hi');

    expect(ctx.stream.notice).toHaveBeenCalledWith(expect.stringMatching(/unavailable/));
    expect(ctx.stream.done).toHaveBeenCalledOnce();
    expect(streamText).toHaveBeenCalledTimes(1);
  });
});
