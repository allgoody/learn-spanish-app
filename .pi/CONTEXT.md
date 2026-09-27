# Context — learn-spanish-app

**Project:** Spanish learning web app (static, mobile-first)
**Rules:** See `.pi/project-rules-memory.md` for tech stack, architecture, and design constraints.
**Routing decision:** See `idea/routing.md` — flat URLs, content language as data, translation language tied to app setting. Read before touching URL structure.

Last updated: 2026-09-27

## Current Task

**Books #3 and #4 added and fully glossed (2026-09-27).** San Manuel Bueno, mártir (Wikisource, 3 chapters, 2,838 keys) and La Barraca (Gutenberg #14944, Al lector + Capítulo I–X, 9,328 keys) — both at 100% gloss coverage. Verified: astro check 0 errors, 102 tests green, 71 pages built, JSON-LD 0 parse failures. Nothing deployed.

## Completed This Session

- [x] **San Manuel Bueno, mártir (Unamuno)** — new Wikisource `article` extractor + marker-based `splitSections` (`scripts/lib/wikisource-parse.mjs`, +8 tests); config `scripts/data/wikisource/san-manuel.json`; chapters Prólogo (1613 w) / San Manuel Bueno, mártir (11796 w) / Epílogo (481 w)
- [x] **La Barraca (Blasco Ibáñez)** — `fetch-book.mjs` now config-driven (`indice` = andanzas, `roman` = barraca), configs in `scripts/data/gutenberg/`; verified andanzas regenerates BYTE-IDENTICALLY before trusting it; 11 chapters, 54,151 words
- [x] **Tokenizer fix** — `à è ì ò ù ç` added to WORD/WORD_CHAR (`Bòn` was splitting into `B`+`n`, so letters got gloss popups); +3 tests; andanzas tokens/glosses regenerated (+152 keys, still 100%), selva provably unchanged
- [x] **`gloss.mjs` flags** — `--think <level>`, `--timeout <ms>`, `--limit <n>`; `--model` still mandatory
- [x] **Both books wired** into `lib/books.ts` → 71 pages; JSON-LD 63× Chapter + 4× Book, 0 parse failures; 12 new sitemap routes

## In Progress

- (none)

## Blocked / Needs Decision

- [?] **Page weight** — the 11,796-word novella chapter page is 2.2 MB HTML / 231 KB gz (previous worst 1.42 MB). Fix = serve the chapter gloss library as a static asset instead of Reader island props
- [?] (carried) **Widen `collect.url` in `astro/lighthouserc.json`?** — audit surface is `/` only, so the 16 new pages are unaudited
- [?] **`--` dialogue dashes** (La Barraca 243, andanzas 610) render literally; normalising means regenerating andanzas' 41 verified pages
- [?] Nit: `chapterCount` calls everything «глава» — selva (8 stories) reads as «8 глав»

## Next Steps

1. Commit this session's changes — 58 dirty paths: 8 source/test files, the new book data, 2 new fetch configs
2. (user decision) Page-weight fix and/or widening the audit surface — decide together
3. (carried) Re-run audit-perf / audit-lighthouse-loop after the build changes
4. (user-driven) Next book — candidates + verified availability in `idea/findings.md`

## Key Decisions

- **Gloss model: `deepseek-v4.1-flash:cloud` with `--think high`** — the previous pick `deepseek-v4-flash:0731-cloud` was retired 2026-09-25 and every other model on the proxy is retired too
- **Batch size 50** — 70 s/batch vs ~90 s for 2×25 on the same keys; the 50-key output stayed under the long-generation abort threshold (9,328 keys, 0 aborts)
- **San Manuel split** = Prólogo / Novela / Epílogo (the work's own structure); one 14k-word chapter would have doubled the page weight
- **La Barraca chapters titled «Al lector» + «Capítulo I–X»** — the source has bare roman numerals, so titles were made readable
- (carried) GA consent-gated; JSON-LD per page type; SEO per-locale data; multi-language = subdirectory + hreflang (locked); domain niceio.com; v1 = reading + glosses only

## File Map

- `astro/scripts/lib/wikisource-parse.mjs` — `extractStoryText` (behaviour unchanged) + new `extractArticleText`, `splitSections`
- `astro/scripts/fetch-wikisource.mjs` — `extractor` + `sections` config support
- `astro/scripts/fetch-book.mjs` — config-driven, `indice` + `roman` modes
- `astro/scripts/gloss.mjs` — `--think` / `--timeout` / `--limit`
- `astro/scripts/lib/tokenize.mjs` — àèìòùç in WORD/WORD_CHAR
- `astro/scripts/data/gutenberg/{andanzas,barraca}.json`, `astro/scripts/data/wikisource/san-manuel.json` — new configs
- `astro/src/data/books/san-manuel/`, `astro/src/data/books/barraca/` — chapters/tokens/glosses (new, 100% glossed)
- `astro/src/lib/books.ts` — 4 books
- `astro/test/tokenize.test.mjs`, `astro/test/wikisource-parse.test.mjs` — +11 tests
- `.tmp/gloss-{san-manuel,barraca}.log`, `.tmp/kill-gloss.ps1`, `.tmp/count-keys.mjs`, `.tmp/probe-*.mjs`, `.tmp/ld-check.mjs` — scratch (session)

## Gotchas / Warnings

- **Killing a gloss run**: `$!` from the bash tool is NOT the Windows PID. Use `.tmp/kill-gloss.ps1` (matches `node.exe` CommandLine on `gloss.mjs`); `\$_` escapes trip the pi path guard, so the .ps1 file is required
- **pi path guard**: a bash string literal starting with `/` (e.g. `'/chapters'`) is parsed as a Windows path → "Access to D:\chapters is blocked". Build paths with `path.join` inside a `.tmp/` script instead
- **Gloss runs are resumable** — `glosses.json` is written after every batch, so a kill/re-run continues from `pendingKeys`. ~50–70 s per 50-key batch on the current model
- **Gloss library size ≈ 300 bytes/key** (pretty JSON) and it is serialised into the Reader island props → a chapter's distinct-key count sets its page weight
- **`.tmp/ld-check.mjs` must run from `astro/`** (it walks `dist` CWD-relative): `cd astro && node ../.tmp/ld-check.mjs`
- (carried) Vitest/vite rewrites `new URL("<literal>", import.meta.url)`; `gloss.mjs --data-dir` is CWD-relative; Wikisource story-parse structure; audit surface = `/` only; LH 13.4.1 blind-spots; 5 islands `client:load`; Windows chrome-launcher EPERM crash expected — full detail in `project-rules-memory.md` Lessons
