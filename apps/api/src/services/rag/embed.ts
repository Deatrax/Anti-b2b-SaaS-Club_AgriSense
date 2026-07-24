// rag/embed.ts — OpenAI text-embedding-3-small → 1536-d (§C.1, matches migration vector(1536)).
import { env } from '../../config/env';

export async function embed(_text: string): Promise<number[]> {
  // TODO: call OpenAI embeddings (env.EMBEDDING_MODEL); return the 1536-d vector.
  //       Cache rehearsed-phrase embeddings on disk for demo determinism (§C.5 fallback).
  void env;
  throw new Error('embed not implemented');
}
