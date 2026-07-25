// orchestrator serialization + ordering regressions (bug_report_tier0.md BUG-1, BUG-12).
// BUG-1: pg returns Date objects for date/timestamp columns; embedding them raw in a
// tool-result message made the NEXT streamText call throw AI_InvalidPromptError — every
// MAINTAINING turn died after its first tool call. toJsonSafe round-trips the result.
// BUG-12: history was fetched AFTER inserting the user message, so the model saw every
// farmer message twice (once from history, once from the explicit push).
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
    begin: (() => { let s = 0; return vi.fn(async () => { s += 1; return { id: `t${s}`, step: s, startedAt: Date.now() }; }); })(),
    ok: vi.fn(async () => undefined),
    error: vi.fn(async () => undefined),
    fallback: vi.fn(async () => undefined),
  },
}));

const { runAgent, toJsonSafe } = await import('../src/services/agent/orchestrator');
const { register, getRegistry } = await import('../src/services/tools/registry');

const maintainingState: FieldState = {
  identity: {
    id: 'f1', farmId: 'farm1', name: 'Field', areaHa: 2, soilType: 'clay_loam',
    waterSource: 'rainfed', lat: 23.9999, lon: 90.4203, budgetBdt: 30000,
  },
  missingFields: [],
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

function streamResult(text: string, toolCalls: unknown[] = [], responseMessages?: unknown[]) {
  return {
    textStream: (async function* () {
      if (text) yield text;
    })(),
    toolCalls: Promise.resolve(toolCalls),
    responseMessages: Promise.resolve(responseMessages ?? (text ? [{ id: 'm', role: 'assistant', content: text }] : [])),
  };
}

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

describe('toJsonSafe (BUG-1)', () => {
  it('converts Date instances to ISO strings and drops undefined', () => {
    expect(toJsonSafe({ occurred_at: new Date('2026-07-24T22:32:33.215Z'), n: 1, u: undefined })).toEqual({
      occurred_at: '2026-07-24T22:32:33.215Z',
      n: 1,
    });
  });

  it('handles nested rows the way pg returns them', () => {
    const out = toJsonSafe({
      data: { log: { id: 'l1', occurred_at: new Date('2026-07-24T18:00:00.000Z') }, replanRecommended: true },
    });
    expect(out).toEqual({
      data: { log: { id: 'l1', occurred_at: '2026-07-24T18:00:00.000Z' }, replanRecommended: true },
    });
  });

  it('degrades to an error object instead of throwing on unserializable input', () => {
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    expect(toJsonSafe(cyclic)).toEqual({ error: 'tool result was not JSON-serializable' });
  });
});

describe('runAgent tool-result serialization (BUG-1)', () => {
  it('a tool returning pg Date objects yields a JSON-safe tool-result message', async () => {
    register({
      name: 'log_field_event',
      description: 'test',
      schema: { parse: (v: unknown) => v } as never,
      toolClass: 'field',
      phases: ['MAINTAINING'],
      handler: async () => ({
        data: { log: { occurred_at: new Date('2026-07-24T22:32:33.215Z') } },
        provenance: [{ source: 'Farmer-reported field log', method: 'memory' as const, retrievedAt: 'now' }],
      }),
    });

    const { impl, box } = snapshotMessagesOnCall(streamResult('logged it'));
    streamText
      .mockReturnValueOnce(
        streamResult('', [{ toolCallId: 'call-1', toolName: 'log_field_event', input: {} }], [
          { id: 'm1', role: 'assistant', content: [{ type: 'tool-call', toolCallId: 'call-1', toolName: 'log_field_event', input: {} }] },
        ]),
      )
      .mockImplementationOnce(impl);

    await runAgent(makeCtx(), 'log 30mm irrigation');

    const toolResultMessage = box.messages[box.messages.length - 1] as {
      content: Array<{ output: { value: unknown } }>;
    };
    const value = toolResultMessage.content[0]!.output.value;
    // The Date must have become a string — a Date instance here is exactly the
    // AI_InvalidPromptError crash from the live test.
    expect(JSON.stringify(value)).toContain('"2026-07-24T22:32:33.215Z"');
    expect((value as { data: { log: { occurred_at: unknown } } }).data.log.occurred_at).toBeTypeOf('string');
  });
});

describe('runAgent history ordering (BUG-12)', () => {
  it('fetches history BEFORE inserting the user message so the turn is not duplicated', async () => {
    streamText.mockReturnValueOnce(streamResult('hi'));

    await runAgent(makeCtx(), 'hello');

    const historyOrder = recentMessages.mock.invocationCallOrder[0]!;
    const insertOrder = addMessage.mock.invocationCallOrder[0]!;
    expect(historyOrder).toBeLessThan(insertOrder);
  });

  it('sends exactly one copy of the current user message even with prior history', async () => {
    recentMessages.mockResolvedValue([
      { id: 'h1', conversationId: 'conv-1', role: 'user', content: 'earlier question', toolCalls: null, isProactive: false, createdAt: '' },
      { id: 'h2', conversationId: 'conv-1', role: 'assistant', content: 'earlier answer', toolCalls: null, isProactive: false, createdAt: '' },
    ]);
    const { impl, box } = snapshotMessagesOnCall(streamResult('answer'));
    streamText.mockImplementationOnce(impl);

    await runAgent(makeCtx(), 'new question');

    const copies = box.messages.filter(
      (m) => (m as { role: string; content: unknown }).role === 'user' && (m as { content: unknown }).content === 'new question',
    );
    expect(copies).toHaveLength(1);
  });
});
