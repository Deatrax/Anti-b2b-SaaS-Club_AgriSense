// M — KB chunks. Vector search with an optional crop pre-filter (§C.6). Returns the
// similarity score so it can be shown in the trace/evidence panel (judges like a real score).
import { query } from '../config/db';

export interface KbChunkHit {
  id: string;
  content: string;
  source: string;
  reference: string | null;
  crop: string | null;
  section: string | null;
  similarity: number;
}

export const KbChunkModel = {
  async search(embedding: number[], crop: string | null, limit = 4): Promise<KbChunkHit[]> {
    const vec = `[${embedding.join(',')}]`;
    return query<KbChunkHit>(
      `select id, content, source, reference, crop, section,
              1 - (embedding <=> $1::vector) as similarity
       from kb_chunks
       where ($2::text is null or crop = $2 or crop is null)
       order by embedding <=> $1::vector
       limit $3`,
      [vec, crop, limit],
    );
  },

  async insert(chunk: {
    content: string;
    source: string;
    reference?: string;
    crop?: string;
    section?: string;
    lang?: string;
    embedding: number[];
  }): Promise<void> {
    const vec = `[${chunk.embedding.join(',')}]`;
    await query(
      `insert into kb_chunks (content, source, reference, crop, section, lang, embedding)
       values ($1,$2,$3,$4,$5,$6,$7::vector)`,
      [
        chunk.content,
        chunk.source,
        chunk.reference ?? null,
        chunk.crop ?? null,
        chunk.section ?? null,
        chunk.lang ?? null,
        vec,
      ],
    );
  },
};
