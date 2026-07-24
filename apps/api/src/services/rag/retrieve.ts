// rag/retrieve.ts — build the query from FIELD STATE (not the raw utterance) → embed →
// KbChunkModel.search with crop pre-filter → honest threshold (§C.6).
import { embed } from './embed';
import { KbChunkModel, type KbChunkHit } from '../../models/kbChunk.model';

export interface RetrieveOpts {
  crop?: string;
  stage?: string;
  topic?: string;
  soilType?: string;
  aez?: number;
}

export interface RetrieveResult {
  /** The composed query actually embedded — surfaced so the trace shows how retrieval was
   * grounded in field state, not the farmer's raw wording. */
  query: string;
  hits: KbChunkHit[];
}

const SIMILARITY_THRESHOLD = 0.35;
const LIMIT = 4;

/** crop/stage are stored as snake_case keys ("aman_rice", "panicle_initiation") to match
 * crop_rules.json — but embedding "aman_rice" as one token measurably hurt retrieval versus
 * "aman rice" (confirmed live: identical query, "AEZ 9 loam" appended, 0 hits vs 4 hits).
 * Humanize only the text handed to the embedding model; KbChunkModel.search's exact-match
 * crop filter still gets the raw key below, unaffected. */
const humanize = (s: string) => s.replace(/_/g, ' ');

export async function retrieve(opts: RetrieveOpts): Promise<RetrieveResult> {
  const query = [
    opts.crop && humanize(opts.crop),
    opts.stage && humanize(opts.stage),
    opts.topic,
    opts.aez != null ? `AEZ ${opts.aez}` : null,
    opts.soilType && humanize(opts.soilType),
  ]
    .filter((v): v is string => Boolean(v))
    .join(' ');
  if (!query) {
    throw new Error('retrieve called with no query terms — pass at least one of crop/stage/topic/aez/soilType.');
  }

  const embedding = await embed(query);
  const hits = await KbChunkModel.search(embedding, opts.crop ?? null, LIMIT);
  // Threshold honestly (§C.6 step 6): below this, return empty and let the agent say so —
  // never paper over a retrieval miss with a weak match.
  return { query, hits: hits.filter((h) => h.similarity >= SIMILARITY_THRESHOLD) };
}
