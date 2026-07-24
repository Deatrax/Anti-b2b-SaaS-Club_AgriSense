// knowledge.tools.test.ts — Phase 6: search_knowledge_base builds its query from field state
// (crop/stage from the active cycle, soil from identity, AEZ from the farm), not the raw
// utterance — args only ever supply `topic`. Models + retrieve() are mocked.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ToolCtx } from '../src/services/tools/registry';

const getState = vi.fn();
const farmGet = vi.fn();
const retrieveMock = vi.fn();

vi.mock('../src/models/field.model', () => ({ FieldModel: { getState } }));
vi.mock('../src/models/farm.model', () => ({ FarmModel: { get: farmGet } }));
vi.mock('../src/services/rag/retrieve', () => ({ retrieve: retrieveMock }));
vi.mock('../src/models/trace.model', () => ({
  TraceModel: {
    begin: vi.fn(async (_c: string, _m: string | null, step: number) => ({ id: `t${step}`, step, startedAt: Date.now() })),
    ok: vi.fn(async () => undefined),
    error: vi.fn(async () => undefined),
    fallback: vi.fn(async () => undefined),
  },
}));

const { registerKnowledgeTools } = await import('../src/services/tools/knowledge.tools');
const { getRegistry } = await import('../src/services/tools/registry');

registerKnowledgeTools();

function makeCtx(): ToolCtx {
  return {
    conversationId: `conv-${Math.random()}`,
    messageId: null,
    fieldId: 'field-1',
    stream: { text: vi.fn(), toolStart: vi.fn(), toolEnd: vi.fn(), notice: vi.fn(), done: vi.fn() },
  };
}

const maintainingState = {
  identity: { id: 'field-1', farmId: 'farm-1', name: 'Field', areaHa: 0.4, soilType: 'loam', waterSource: 'shallow_tubewell', lat: 24.7, lon: 90.4, budgetBdt: 40000 },
  missingFields: [],
  activeCycle: { id: 'c1', fieldId: 'field-1', crop: 'aman_rice', variety: null, season: 'aman', sowingDate: null, expectedHarvest: null, status: 'active', stage: 'tillering', dayIndex: 20, actualYieldKg: null },
};

const planningState = { identity: maintainingState.identity, missingFields: [], activeCycle: null };

async function call(args: unknown, ctx = makeCtx()) {
  return getRegistry().get('search_knowledge_base')!.handler(args, ctx);
}

beforeEach(() => {
  vi.clearAllMocks();
  getState.mockResolvedValue(maintainingState);
  farmGet.mockResolvedValue({ id: 'farm-1', user_id: 'u1', name: 'Farm', district: 'Mymensingh', lat: 24.7, lon: 90.4, aez: 9 });
  retrieveMock.mockResolvedValue({ query: 'aman_rice tillering nitrogen management AEZ 9 loam', hits: [] });
});

describe('search_knowledge_base', () => {
  it('builds the retrieve() call from field state, not the raw args, with topic as the only pass-through', async () => {
    await call({ topic: 'nitrogen management' });
    expect(retrieveMock).toHaveBeenCalledWith({
      crop: 'aman_rice',
      stage: 'tillering',
      topic: 'nitrogen management',
      soilType: 'loam',
      aez: 9,
    });
  });

  it('omits crop/stage during PLANNING when there is no active cycle yet', async () => {
    getState.mockResolvedValue(planningState);
    await call({ topic: 'variety selection' });
    expect(retrieveMock).toHaveBeenCalledWith({
      crop: undefined,
      stage: undefined,
      topic: 'variety selection',
      soilType: 'loam',
      aez: 9,
    });
  });

  it('turns each hit into a provenance entry with method "rag"', async () => {
    retrieveMock.mockResolvedValue({
      query: 'q',
      hits: [{ id: 'c1', content: 'text', source: 'IRRI RKB', reference: 'Bacterial blight (url)', crop: null, section: 'diseases', similarity: 0.6 }],
    });
    const out = await call({ topic: 'bacterial blight' });
    expect(out.provenance).toEqual([{ source: 'IRRI RKB', reference: 'Bacterial blight (url)', method: 'rag', retrievedAt: expect.any(String) }]);
  });

  it('flags an honest assumption when nothing clears the similarity threshold', async () => {
    retrieveMock.mockResolvedValue({ query: 'q', hits: [] });
    const out = await call({ topic: 'obscure topic' });
    expect(out.assumptions?.[0]).toMatch(/No supporting document found/);
  });

  it('omits the assumption when real hits come back', async () => {
    retrieveMock.mockResolvedValue({ query: 'q', hits: [{ id: 'c1', content: 't', source: 's', reference: null, crop: null, section: null, similarity: 0.5 }] });
    const out = await call({ topic: 'x' });
    expect(out.assumptions).toBeUndefined();
  });

  it('falls back to an empty, honestly-flagged result when embed/search is unavailable', async () => {
    retrieveMock.mockRejectedValue(new Error('ECONNRESET'));
    const out = await call({ topic: 'x' });
    expect(out.data).toEqual({ query: '', hits: [] });
    expect(out.assumptions?.[0]).toMatch(/unavailable/);
  });
});
