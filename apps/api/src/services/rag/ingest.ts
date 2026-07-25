// rag/ingest.ts — OFFLINE (§C.6 step 4). Chunk data/raw (PROSE only, never tables)
// → embed → emit db/seeds/kb_chunks.sql with vectors inline. NEVER runs during the demo.
// Run: npm run ingest
//
// Sources used (§C.6's own priority list) and why others in data/raw/ aren't here yet:
//   - irri_rkb, banglapedia, bamis: clean extracted prose, used as-is.
//   - barc_frg_2018: 286 OCR'd pages: only non-table pages (`likely_table: false`) that also
//     pass a prose-quality heuristic (below) are used — table pages feed crop_rules.json, not
//     this index, and even non-table pages sometimes OCR'd a chart/figure into noise.
//   - bari_bina_booklets, ais_krishi_diary: raw PDFs with no extracted text yet (added after
//     this pipeline was scoped) — need an OCR/extraction pass first, not done here.
//   - bari_varieties, brri_varieties, fao_ecocrop, fao_cropcalendar: structured facts, not
//     "why/how" prose — already feed crop_rules.json/suitability.json directly instead.
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { embedBatch } from './embed';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAW_DIR = path.resolve(__dirname, '../../../../../data/raw');
const OUT_FILE = path.resolve(__dirname, '../../db/seeds/kb_chunks.sql');

interface ChunkMeta {
  source: string;
  reference: string | null;
  crop: string | null;
  section: string | null;
  lang: string;
}

interface SourceDoc {
  text: string;
  meta: ChunkMeta;
}

// ─── chunking (300–600 tokens ≈ 250–450 words, ~15% overlap, never mid-sentence) ─────────
const TARGET_WORDS = 400;
const MAX_WORDS = 550;
const OVERLAP_RATIO = 0.15;
const MIN_TRAILING_WORDS = 30;

function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter((p) => p.length > 0);
}

function splitLongParagraph(paragraph: string): string[] {
  const sentences = paragraph.split(/(?<=[.!?])\s+/);
  const parts: string[] = [];
  let current: string[] = [];
  let count = 0;
  for (const sentence of sentences) {
    const n = sentence.split(/\s+/).length;
    if (count + n > MAX_WORDS && current.length) {
      parts.push(current.join(' '));
      current = [];
      count = 0;
    }
    current.push(sentence);
    count += n;
  }
  if (current.length) parts.push(current.join(' '));
  return parts;
}

/** Semantic-section chunking: paragraph-greedy accumulation to ~TARGET_WORDS, splitting an
 * oversized paragraph by sentence, and carrying the last ~15% of words forward as overlap. */
export function chunkText(text: string): string[] {
  const paragraphs = splitParagraphs(text).flatMap((p) =>
    p.split(/\s+/).length > MAX_WORDS ? splitLongParagraph(p) : [p],
  );

  const chunks: string[] = [];
  let current: string[] = [];
  let wordCount = 0;

  // Both flush triggers below (an oversized next paragraph, or reaching TARGET_WORDS) must
  // carry the same ~15% overlap forward — they used to diverge (only the first carried
  // overlap), which silently dropped overlap in the common "reached target" case.
  function flush(): void {
    chunks.push(current.join('\n\n'));
    const words = current.join(' ').split(/\s+/);
    const overlap = words.slice(-Math.round(words.length * OVERLAP_RATIO));
    current = overlap.length ? [overlap.join(' ')] : [];
    wordCount = overlap.length;
  }

  for (const paragraph of paragraphs) {
    const paraWords = paragraph.split(/\s+/).length;
    if (wordCount + paraWords > MAX_WORDS && current.length) {
      flush();
    }
    current.push(paragraph);
    wordCount += paraWords;
    if (wordCount >= TARGET_WORDS) {
      flush();
    }
  }
  if (current.length) {
    const joined = current.join('\n\n');
    if (joined.split(/\s+/).length < MIN_TRAILING_WORDS && chunks.length) {
      chunks[chunks.length - 1] += '\n\n' + joined;
    } else {
      chunks.push(joined);
    }
  }
  return chunks;
}

// ─── source extraction ────────────────────────────────────────────────────────────────
function readJson<T>(relPath: string): T {
  return JSON.parse(readFileSync(path.join(RAW_DIR, relPath), 'utf-8')) as T;
}

function extractIrriRkb(): SourceDoc[] {
  const manifest = readJson<{ slug: string; title: string; url: string; category: string; status: string }[]>(
    'irri_rkb/manifest.json',
  );
  return manifest
    .filter((e) => e.status === 'ok')
    .map((e) => ({
      text: readFileSync(path.join(RAW_DIR, 'irri_rkb', `${e.slug}.txt`), 'utf-8'),
      meta: {
        source: 'IRRI Rice Knowledge Bank',
        reference: `${e.title} (${e.url})`,
        crop: null, // applies across rice varieties — kbChunk.search()'s `crop is null` matches any crop filter
        section: e.category,
        lang: 'en',
      },
    }));
}

function extractBanglapedia(): SourceDoc[] {
  const manifest = readJson<{ slug: string; title: string; url: string; status: string }[]>('banglapedia/manifest.json');
  return manifest
    .filter((e) => e.status === 'ok')
    .map((e) => ({
      text: readFileSync(path.join(RAW_DIR, 'banglapedia', `${e.slug}.txt`), 'utf-8'),
      meta: {
        source: 'Banglapedia (Asiatic Society of Bangladesh)',
        reference: `${e.title} (${e.url})`,
        crop: null,
        section: 'reference',
        lang: 'en',
      },
    }));
}

function extractBamis(): SourceDoc[] {
  const meta = readJson<{ title: string; url: string }>('bamis/aez-overview_meta.json');
  return [
    {
      text: readFileSync(path.join(RAW_DIR, 'bamis', 'aez-overview.txt'), 'utf-8'),
      meta: {
        source: 'BAMIS (Dept. of Agricultural Extension)',
        reference: `${meta.title} (${meta.url})`,
        crop: null,
        section: 'aez',
        lang: 'en',
      },
    },
  ];
}

/** Fraction of whitespace-split tokens that look like real words — cheap filter against
 * OCR noise from a chart/figure landing on an otherwise-prose page. */
function proseQualityRatio(text: string): number {
  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length) return 0;
  const good = words.filter((w) => /^[A-Za-z][A-Za-z'-]+$/.test(w)).length;
  return good / words.length;
}

/** Structural markers of the FRG's per-crop soil-test-level dose tables (§C.6's own rule:
 * RAG must never hold a kg/ha figure). These pages mix real N/P/K/S numbers with enough
 * surrounding prose ("Method of application...") to pass proseQualityRatio, so they need
 * their own explicit exclusion — found by manually inspecting a retrieval result that
 * surfaced one (page 96/printed 86) and grepping the corpus for the same marker text. */
function isDoseTablePage(text: string): boolean {
  return text.includes('Soil Analysis Nutrient Recommendation') || text.includes('Yield Goal:');
}

function extractBarcFrg(): SourceDoc[] {
  const manifest = readJson<{ page: number; printed_page: number | null; char_count: number; likely_table: boolean; status: string }[]>(
    'barc_frg_2018/manifest.json',
  );
  const docs: SourceDoc[] = [];
  for (const e of manifest) {
    if (e.status !== 'ok' || e.likely_table || e.char_count <= 500) continue;
    const text = readFileSync(path.join(RAW_DIR, 'barc_frg_2018', `page_${String(e.page).padStart(4, '0')}.txt`), 'utf-8');
    if (proseQualityRatio(text) < 0.6) continue; // chart/figure OCR noise, not prose
    if (isDoseTablePage(text)) continue; // soil-test dose table — belongs in crop_rules.json, not here
    docs.push({
      text,
      meta: {
        source: 'BARC Fertilizer Recommendation Guide (FRG) 2018',
        reference: e.printed_page != null ? `p.${e.printed_page}` : `PDF p.${e.page} (front matter, unpaginated)`,
        crop: null, // general fertilizer-management prose, not tied to one crop
        section: 'fertilizer_management',
        lang: 'en',
      },
    });
  }
  return docs;
}

// ─── SQL emission ──────────────────────────────────────────────────────────────────────
function sqlString(s: string): string {
  return `'${s.replace(/\0/g, '').replace(/'/g, "''")}'`;
}

function sqlStringOrNull(s: string | null): string {
  return s == null ? 'null' : sqlString(s);
}

async function main() {
  const docs = [...extractIrriRkb(), ...extractBanglapedia(), ...extractBamis(), ...extractBarcFrg()];
  console.log(`ingest: ${docs.length} source documents`);

  const chunks: (ChunkMeta & { content: string })[] = [];
  for (const doc of docs) {
    for (const content of chunkText(doc.text)) {
      chunks.push({ content, ...doc.meta });
    }
  }
  console.log(`ingest: ${chunks.length} chunks after splitting`);

  console.log('ingest: embedding via OpenAI (this calls the real API)...');
  const BATCH_SIZE = 100;
  const embeddings: number[][] = [];
  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE).map((c) => c.content);
    const batchEmbeddings = await embedBatch(batch);
    embeddings.push(...batchEmbeddings);
    console.log(`ingest: embedded ${embeddings.length}/${chunks.length}`);
  }

  const lines: string[] = [
    '-- kb_chunks.sql — GENERATED by `npm run ingest` (services/rag/ingest.ts), committed as a seed.',
    '-- Do NOT hand-edit. Ingestion runs ONCE offline on a laptop and emits INSERTs with the',
    '-- 1536-d embedding vectors inline, so the demo never re-embeds (§C.6 step 4).',
    '',
    'delete from kb_chunks;',
    '',
  ];
  for (let i = 0; i < chunks.length; i++) {
    const c = chunks[i]!;
    const vec = `[${embeddings[i]!.join(',')}]`;
    lines.push(
      `insert into kb_chunks (content, source, reference, crop, section, lang, embedding) values (${sqlString(c.content)}, ${sqlString(c.source)}, ${sqlStringOrNull(c.reference)}, ${sqlStringOrNull(c.crop)}, ${sqlStringOrNull(c.section)}, ${sqlString(c.lang)}, '${vec}'::vector);`,
    );
  }
  writeFileSync(OUT_FILE, lines.join('\n') + '\n', 'utf-8');
  console.log(`ingest: wrote ${chunks.length} chunks to ${OUT_FILE}`);
}

// Only run when executed directly (`tsx src/services/rag/ingest.ts`), not when this module
// is imported elsewhere — chunkText() is exported for unit testing, and importing it must
// never trigger a real OpenAI call + overwrite the committed seed as a side effect.
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
