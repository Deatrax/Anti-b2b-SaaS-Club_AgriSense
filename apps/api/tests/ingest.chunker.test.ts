// ingest.chunker.test.ts — §C.6 step 2: semantic-section chunking, 300–600 tokens (~250–450
// words), ~15% overlap, never mid-sentence. Pure function, no OpenAI/DB involved.
import { describe, it, expect } from 'vitest';
import { chunkText } from '../src/services/rag/ingest';

function words(n: number, prefix = 'word'): string {
  return Array.from({ length: n }, (_, i) => `${prefix}${i}`).join(' ') + '.';
}

describe('chunkText', () => {
  it('keeps short text as a single chunk', () => {
    const text = `${words(50)}\n\n${words(50)}`;
    expect(chunkText(text)).toHaveLength(1);
  });

  it('splits text well over the target into multiple chunks', () => {
    const paragraphs = Array.from({ length: 6 }, () => words(150));
    const chunks = chunkText(paragraphs.join('\n\n'));
    expect(chunks.length).toBeGreaterThan(1);
  });

  it('keeps chunks within a reasonable word-count band (never wildly over target)', () => {
    const paragraphs = Array.from({ length: 10 }, () => words(80));
    const chunks = chunkText(paragraphs.join('\n\n'));
    for (const c of chunks) {
      expect(c.split(/\s+/).length).toBeLessThanOrEqual(650); // MAX_WORDS(550) + one paragraph's slack
    }
  });

  it('carries some of the tail of one chunk forward into the next as overlap', () => {
    const paragraphs = Array.from({ length: 6 }, (_, i) => words(120, `p${i}_w`));
    const chunks = chunkText(paragraphs.join('\n\n'));
    expect(chunks.length).toBeGreaterThan(1);
    // ~15% of a several-hundred-word chunk is itself dozens of words, so compare generously
    // wide windows rather than a narrow slice that could miss the overlap entirely.
    const tailOfFirst = new Set(chunks[0]!.split(/\s+/).slice(-100));
    const headOfSecond = chunks[1]!.split(/\s+/).slice(0, 100);
    expect(headOfSecond.some((w) => tailOfFirst.has(w))).toBe(true);
  });

  it('splits a single paragraph that alone exceeds the max by sentence, never mid-sentence', () => {
    const longParagraph = Array.from({ length: 100 }, (_, i) => `Sentence number ${i} has exactly six words here.`).join(' ');
    const chunks = chunkText(longParagraph);
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) {
      expect(c.trim().endsWith('.')).toBe(true); // never truncated mid-sentence
    }
  });

  it('merges a too-short trailing remainder into the previous chunk instead of emitting an orphan', () => {
    const paragraphs = [words(450), 'Tiny tail.'];
    const chunks = chunkText(paragraphs.join('\n\n'));
    expect(chunks[chunks.length - 1]).toContain('Tiny tail.');
    // the tail should not have become its own separate one-sentence chunk
    expect(chunks.every((c) => c.split(/\s+/).length > 10)).toBe(true);
  });

  it('drops empty paragraphs from repeated blank lines without crashing', () => {
    const text = `${words(30)}\n\n\n\n${words(30)}`;
    expect(() => chunkText(text)).not.toThrow();
    expect(chunkText(text).join(' ')).not.toMatch(/^\s*$/);
  });
});
