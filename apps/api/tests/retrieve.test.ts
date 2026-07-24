// retrieve.test.ts — §C.6: query built from FIELD STATE, embedded, searched, thresholded
// honestly at 0.35. embed and KbChunkModel are mocked; the query-construction and
// threshold logic itself is real.
import { describe, it, expect, vi, beforeEach } from 'vitest';

const embed = vi.fn(async () => [0.1, 0.2, 0.3]);
const search = vi.fn();

vi.mock('../src/services/rag/embed', () => ({ embed }));
vi.mock('../src/models/kbChunk.model', () => ({ KbChunkModel: { search } }));

const { retrieve } = await import('../src/services/rag/retrieve');

function hit(similarity: number, overrides: Partial<{ id: string; content: string; source: string; reference: string | null; crop: string | null; section: string | null }> = {}) {
  return { id: 'c1', content: 'chunk text', source: 'Test Source', reference: null, crop: null, section: null, similarity, ...overrides };
}

beforeEach(() => {
  vi.clearAllMocks();
  search.mockResolvedValue([]);
});

describe('retrieve', () => {
  it('composes the query from field-state fields, not raw text, in the documented order', async () => {
    await retrieve({ crop: 'aman_rice', stage: 'tillering', topic: 'nitrogen management', aez: 9, soilType: 'loam' });
    expect(embed).toHaveBeenCalledWith('aman rice tillering nitrogen management AEZ 9 loam');
  });

  it('humanizes snake_case crop/stage for the embedded text, but keeps the raw key for the search filter', async () => {
    await retrieve({ crop: 'aman_rice', stage: 'panicle_initiation', topic: 'x' });
    expect(embed).toHaveBeenCalledWith('aman rice panicle initiation x');
    expect(search).toHaveBeenCalledWith(expect.anything(), 'aman_rice', 4);
  });

  it('omits missing fields from the query rather than inserting empty tokens', async () => {
    await retrieve({ topic: 'bacterial blight identification' });
    expect(embed).toHaveBeenCalledWith('bacterial blight identification');
  });

  it('throws when no query terms are given at all', async () => {
    await expect(retrieve({})).rejects.toThrow(/no query terms/);
  });

  it('passes the crop through to KbChunkModel.search as the pre-filter, with limit 4', async () => {
    await retrieve({ crop: 'aman_rice', topic: 'x' });
    expect(search).toHaveBeenCalledWith([0.1, 0.2, 0.3], 'aman_rice', 4);
  });

  it('passes null crop when none is known (so the search sees no crop restriction)', async () => {
    await retrieve({ topic: 'x' });
    expect(search).toHaveBeenCalledWith([0.1, 0.2, 0.3], null, 4);
  });

  it('drops hits below the 0.35 similarity threshold rather than papering over a miss', async () => {
    search.mockResolvedValue([hit(0.6), hit(0.34), hit(0.35), hit(0.1)]);
    const result = await retrieve({ topic: 'x' });
    expect(result.hits.map((h) => h.similarity)).toEqual([0.6, 0.35]);
  });

  it('returns an empty hits array (not an error) when everything is below threshold', async () => {
    search.mockResolvedValue([hit(0.2), hit(0.1)]);
    const result = await retrieve({ topic: 'x' });
    expect(result.hits).toEqual([]);
  });

  it('surfaces the composed query on the result for trace visibility', async () => {
    const result = await retrieve({ crop: 'aman_rice', topic: 'x' });
    expect(result.query).toBe('aman rice x');
  });
});
