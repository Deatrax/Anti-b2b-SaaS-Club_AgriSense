// rag/ingest.ts — OFFLINE (§C.6 step 4). Chunk data/raw + data/corpus (PROSE only, never tables)
// → embed → emit db/seeds/kb_chunks.sql with vectors inline. NEVER runs during the demo.
// Run: npm run ingest
async function main() {
  // TODO: read corpus; semantic-section chunk (300–600 tokens, ~15% overlap); attach metadata
  //       (source, reference, crop, section, lang); embed each; write INSERTs to db/seeds/kb_chunks.sql.
  console.log('ingest: TODO (§C.6) — prose only, target 250–400 chunks.');
}

main();
