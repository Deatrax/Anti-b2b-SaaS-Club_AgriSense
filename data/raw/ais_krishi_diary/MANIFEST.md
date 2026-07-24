# Source 9 — AIS Krishi Diary (কৃষি ডায়েরি) — Collection Manifest

## SOURCE 9 STATUS: FOUND (located, verified, downloaded) — extraction incomplete within time box

## Location & verification (Steps 1–2)
- Publisher confirmed: Agricultural Information Service (AIS / কৃষি তথ্য সার্ভিস),
  Ministry of Agriculture, Bangladesh.
- Found via `ais.gov.bd` static page "কৃষি ডায়েরি" (https://ais.gov.bd/pages/static-pages/695b9b5ac4774958d7b709e6),
  which links to a dedicated 2026-edition sub-page titled
  "কৃষি ডাইরি ২০২৬" (https://ais.gov.bd/pages/static-pages/69743cbcdba0eef4d1d1883c).
  A 2025-edition link is also present on the parent page (not downloaded — 2026 is current).
- Not a summary/blog/repost — this is the AIS-hosted PDF itself (object storage under
  `.../V2Ministry/o/office-ais/2026/...`), served from the ministry's own page.
- No Scribd or paywalled host used.
- robots/reachability note: `ais.gov.bd` serves HTTP→HTTPS redirect only (no body on :80);
  HTTPS has a cert-chain verification issue from this environment (consistent with other
  `.gov.bd` sources already logged in project memory) — fetched with `curl -k`. Content
  itself is public, no auth wall.

**Citation string:**
> AIS Krishi Diary, 2026 edition, ais.gov.bd, retrieved 2026-07-24

## File(s) saved (Step 3)
- `data/raw/ais_krishi_diary/2026_krishi_diary.pdf` — 12,894,452 bytes, PDF v1.7, 301 pages.

## Extraction (Step 4) — INCOMPLETE, reported honestly rather than approximated
- **No text layer.** Sampled pages (0,1,2,5,10,20) all return 0 extractable characters via
  PyMuPDF — same "glyphs as images/vectors" pattern as BARC FRG-2018 (Source 2). Getting
  machine-readable text requires OCR, and this document is Bengali-script, which needs a
  `ben.traineddata` language pack not yet present in this environment (the `eng` pack used
  for Source 2 does not cover Bangla).
- **Document structure sampled visually** (pages 3, 5, 7, 15, 20, 30, 50, 70, 90, 110 of 301,
  rendered to PNG and read directly, no OCR): front matter is personal-info/emergency-contact
  pages, national holiday tables, and a Gregorian calendar (2027) — then an **extensive
  multi-district government/DAE contact directory** (ministries; then district-by-district
  agricultural-extension office contacts — confirmed still running at page 110/301, covering
  Rangamati, Khagrachari, Barisal, SRDI). The crop-calendar / fertilizer-dose / cost tables
  the task targets were **not located** within the pages sampled — they likely exist later in
  the document (this diary format typically embeds small monthly agro-advisory notes within
  the daily-diary section), but pinpointing them needs either OCR-assisted keyword search
  (Bangla, not set up) or continued manual paging, neither of which fit safely inside the
  remaining time box.
- **Decision:** stopped here rather than (a) keep paging on a low-probability manual search
  that risked blowing the hard 20-minute cap, or (b) fabricate/approximate placeholder
  numeric values to look like progress — both would violate this project's core "no invented
  numbers" rule and the time-box discipline.

## Chunk count added to RAG corpus: 0
## Table rows added: 0 (no `calendar.json` created; no rows appended to `crop_rules.json` / `costs_bd.json`)

## Conflicts flagged: none (nothing new was extracted to compare against the existing
`aman_rice` entry in `data/crop_rules.json`, which itself is currently marked `_verify: true`
with placeholder sourcing — "BAMIS / BRRI — VERIFY" for the calendar, "BARC FRG-2018, AEZ-9,
medium soil-test — VERIFY page/table" for fertilizer — still unresolved from a prior session,
noted here for whoever picks this up next).

## What would unblock a real extraction pass (for a future, non-time-boxed attempt)
1. Fetch `ben.traineddata` (tessdata_fast) the same way `eng.traineddata` was fetched for
   Source 2, then OCR the full 301 pages (or at minimum pages ~115–301, past the confirmed
   contact-directory block) and grep the OCR text for landmark Bangla keywords —
   "আমন"/"আউশ"/"বোরো" (rice seasons), "সার" (fertilizer), "রোপণ"/"বপন" (transplant/sow),
   "ফলন" (yield) — to locate candidate pages fast, THEN visually re-verify each candidate
   page's specific numbers against the rendered image before writing any value (per the
   numeric-lane rule: OCR locates, human/vision-read verifies).
2. Once located, extract only the AgriSense-scoped crop (T. Aman rice, Kharif-2/Aman season)
   and whichever of the demo districts appear in this diary's tables — do not broaden beyond
   that, per Step 5 of the original task.

## Time actually spent: ~8 minutes of the 20-minute box
(Steps 1–3 — locate, verify, download — completed in full; remaining time spent sampling
document structure to scope Step 4, then stopped deliberately with time still in reserve
rather than let a manual page-hunt run out the clock.)
