# Source 10 — BARI / BINA / BWMRI Non-Rice Crop Booklets — Collection Manifest

## SOURCE 10 STATUS: PARTIAL (1 of 2 crops covered)

## Step 0 — Applicability
Locked demo crop set includes non-rice crops (potato, maize — established across this
session's prior corpus work: Sources 4/5/8 all targeted rice+potato+maize). NOT rice-only
→ proceeded.

## Crop 1 — POTATO: FOUND
- **File:** `data/raw/bari_bina_booklets/krishi_projukti_hatboi_10th_ed_BARI.pdf`
  (37,583,873 bytes, PDF v1.6, 650 pages — a general multi-crop BARI handbook, not
  potato-specific; potato is one chapter within it).
- **Citation:** BARI (Bangladesh Agricultural Research Institute), *কৃষি প্রযুক্তি হাতবই*
  (Krishi Projukti Hatboi / Agricultural Technology Handbook), 10th edition, linked from
  `bari.gov.bd` (file hosted on Google Drive by BARI's own official static page:
  https://bari.gov.bd/pages/static-pages/6922dd2a933eb65569e13c23), retrieved 2026-07-24.
  **Note on provenance:** this is BARI's *own* primary publication — the domain hosting the
  file (Google Drive) is just their chosen storage, not a third-party mirror/reprint. Not the
  Scribd-hosted copy the project's acquisition map flagged as a dead end for *rice* sourcing;
  that flag was about rice-source redundancy specifically, and doesn't apply to this
  document's non-rice (potato/maize) chapters, which aren't superseded by anything else in
  the corpus.
- **Text-layer check (Step 2, done before any OCR decision):** `pdftotext` returned
  257,045 words — real text layer present. PyMuPDF confirms embedded bookmarks/TOC
  (23 entries with page numbers). **However:** the text is encoded in a legacy
  Bijoy/SutonnyMJ-style Bangla font, NOT Unicode — `pdftotext`/PyMuPDF text extraction
  returns ASCII/Latin-1 glyph soup (e.g. "Avjy" for আলু), not searchable Bangla. No OCR
  needed (there IS a text layer), but the extracted text is not directly usable without a
  legacy-font-to-Unicode decode step (not attempted — out of time budget). Content was
  instead read directly off rendered page images (visual reading, same approach as
  BARC FRG-2018/AIS Krishi Diary), which renders as clean, correct Unicode Bangla.
- **Potato location:** "Kondal Fosal" (কন্দাল ফসল / Tuber Crops) chapter, PDF pages 26–93
  (TOC-confirmed), covering potato, sweet potato, taro, yam, cassava. Potato varieties
  begin around PDF p.28.
- **Numeric-lane data actually read and verified (visual read, cited by PDF page):**
  | Variety | Maturity | Yield | Note |
  |---|---|---|---|
  | BARI Alu-36 | 90–95 days | 30–40 t/ha | p.28 |
  | BARI Alu-40 | 90–95 days | 35–55 t/ha | p.28 |
  | BARI Alu-41 | 90–95 days | 38–54 t/ha | p.29 |
  | BARI Alu-46 | 90–95 days | 30–40 t/ha | late-blight resistant; p.29 |
  | BARI Alu-83 (Cimega) | 65 days (early) | 30.78 t/ha avg, up to 44.63 (38.18–50.52) t/ha | p.40 |
  These corroborate (don't conflict with) the duration/yield ranges already collected in
  Source 8 (`data/raw/bari_varieties/potato_*.json`, BARI Alu-68/69/71/72, 80–95 days,
  25–38 t/ha) — same institute, consistent order of magnitude, different variety IDs.
  **Not located within the time box:** a dedicated sowing/harvest MONTH calendar or an
  N-P-K-S fertilizer dose table for potato specifically (the document does have this exact
  table *shape* — confirmed on a nearby minor-cereal page, see below — so it likely exists
  for potato too, later in the same chapter, just not reached before time ran out).
- **NOT written to `data/crop_rules.json` / `calendar.json` / `costs_bd.json`:** given <5
  minutes remaining after locating the data, appending to the shared numeric-lane files
  without care for schema conformance and cross-checking the existing (already-`_verify:true`)
  entries would risk a rushed, unverified edit — worse than leaving it for a dedicated pass.
  This manifest documents the values so a future pass can add them deliberately.
- **Chunks added:** 0. **Table rows added:** 0.
- **Conflicts flagged:** none written (nothing was merged into the shared files this pass).

## Crop 2 — MAIZE: NOT FOUND within time box (logged as gap, not borrowed time from potato)
- Checked the same Hatboi document's "Dana Fosal" (দানা ফসল / Grain Crops) chapter,
  PDF pages 485–500ish (TOC: internal pp.460–475) — confirmed this section covers only
  **minor cereals** (barley — বার্লি-৭/৮/৯, proso millet — চিনা, foxtail millet — কাউন).
  **Maize (ভুট্টা) does not appear in this BARI handbook.** Consistent with the task's own
  note: maize research now sits with BWMRI, not BARI, so a BARI-published general handbook
  reasonably excludes it.
- Located one live, relevant BWMRI page — "এক নজরে ভুট্টার জাতসমূহ" (Maize Varieties at a
  Glance), `bwmri.gov.bd/site/page/0f6104ca-...` — confirmed reachable (HTTP 200), but no
  direct PDF link found on it within the remaining time; page's actual prose content was
  not read/verified before the clock ran out.
- **No file downloaded for maize. 0 chunks, 0 table rows.**
- This crop already has some coverage from earlier corpus work regardless
  (`data/raw/bari_varieties/maize_*.json`, Source 8 — Barnali, BARI Hybrid Maize-4/5,
  Khoibhutta — planting month + duration + yield from individual BSMRAU variety pages), so
  the gap here is specifically "no BWMRI-published booklet/PDF in the corpus yet," not
  "maize has zero data anywhere."

## Time spent
- Step 0: <1 min.
- Potato: ~10 min (search + verify + download 37.6MB file + text-layer check + TOC read +
  visual page reads).
- Maize: ~5 min (search + one page fetch), then stopped per Step 6 discipline rather than
  extend into potato's or the manifest-writing budget.
- Manifest + wrap-up: ~4 min.
- **Total: ~19–20 minutes** (hard cap respected).

## What would unblock the rest, for a future non-boxed pass
1. Potato: continue reading forward from PDF p.40 in the same Kondal Fosal chapter to find
   the dedicated cultivation-practice/fertilizer-dose subsection (the document's own table
   shape for this is already confirmed via the "চিনা" page: মাটি/বপনের সময়/বীজের হার/
   সারের পরিমাণ with a Urea/TSP/MoP/Gypsum/Zinc-sulphate kg/ha table) — likely present for
   potato too, just further into the chapter than time allowed.
2. Maize: fetch the BWMRI "Maize Varieties at a Glance" page fully, and/or search
   bwmri.gov.bd specifically for a maize cultivation-technology PDF (separate from the
   variety-overview page found here).
3. Once real numeric values are confirmed for both, merge into `crop_rules.json` /
   `calendar.json` carefully, checking against the existing `aman_rice`-style `_verify:true`
   placeholders and any BAMIS-sourced rows for conflicts before writing.
