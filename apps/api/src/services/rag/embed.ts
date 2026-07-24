// rag/embed.ts — OpenAI text-embedding-3-small → 1536-d (§C.1, matches migration vector(1536)).
import { embed as aiEmbed, embedMany } from 'ai';
import { openai } from '@ai-sdk/openai';
import { env } from '../../config/env';

function embeddingModel() {
  if (!env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set — embeddings need it (.env).');
  }
  return openai.embedding(env.EMBEDDING_MODEL);
}

export async function embed(text: string): Promise<number[]> {
  const { embedding } = await aiEmbed({ model: embeddingModel(), value: text });
  return embedding;
}

/** Batches many chunks into fewer OpenAI calls — ingest.ts's offline pipeline over
 * hundreds of chunks, not the live retrieve.ts path (one query = one embed() call). */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  const { embeddings } = await embedMany({ model: embeddingModel(), values: texts });
  return embeddings;
}
