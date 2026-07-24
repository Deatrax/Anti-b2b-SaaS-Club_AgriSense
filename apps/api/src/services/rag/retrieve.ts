// rag/retrieve.ts — build the query from FIELD STATE (not the raw utterance) → embed →
// KbChunkModel.search with crop pre-filter → honest threshold (§C.6).
export interface RetrieveOpts {
  crop?: string;
  stage?: string;
  topic?: string;
  soilType?: string;
  aez?: number;
}

export async function retrieve(_opts: RetrieveOpts): Promise<unknown> {
  // TODO: compose query e.g. "aman_rice tillering nitrogen management AEZ 9 loam" (§C.6);
  //       embed → search → drop results below 0.35 similarity (return empty, let agent say so).
  throw new Error('retrieve not implemented (§C.6)');
}
