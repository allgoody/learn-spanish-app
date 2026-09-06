# Context — learn-spanish-app

**Project:** Spanish learning web app (static, mobile-first)
**Rules:** See `.pi/project-rules-memory.md` for tech stack, architecture, and design constraints.
**Routing decision:** See `idea/routing.md` — flat URLs, content language as data, translation language tied to app setting. Read before touching URL structure.

Last updated: 2026-09-06

## Current Task

**Book #2 (Cuentos de la selva) fully implemented.** Wikisource fetch pipeline (config + tested extractor), 8 chapters fetched, full gloss run (2,822 distinct keys, 100% coverage), wired into books.ts, 90 tests green, build 53 pages. See Completed This Session.

## Completed This Session

- [x] **Book #2: Cuentos de la selva (Quiroga, 1918)** — Wikisource fetch pipeline (config + tested extractor), 8 chapters, full gloss run, wired into books.ts, 90 tests green, build 53 pages
- [x] **review-plan: add-cuentos-de-la-selva** — verified every codebase claim (books.ts content, gloss.mjs retry/resume/`--model` requirement, fetch-book.mjs style, vitest config in astro/, 78 tests, 44 dist pages, all 8 Wikisource page titles exist with `ws-h3-medio`)
- [x] **Found + fixed 2 blocking bugs** (verified live on 3 pages):
  - `id="ws-data"` is in the page HEADER (before the heading), NOT a footer → old `lastIndexOf("</p>", wsData)` = -1 → empty body. Fixed: end = `lastIndexOf("</p>")` in the whole doc + `end <= start` guard
  - First body `<p>` starts with a `<style>` block (dropinitial CSS, ~500 chars) → CSS leaked into the text. Fixed: strip `<style>`/`<script>` blocks before the tag strip
- [x] **Rebuilt WP-2 fixture to mirror the real page** (ws-data before heading, style inside first `<p>`), added 6th test (style strip + non-empty body). All 6 assertions verified passing; corrected algorithm verified on the real page: 1710 words, starts "Había una vez", no CSS/wsbox leak, "tortuga" + "fué" present
- [x] **Fixed cwd contradiction** — `cd astro` now explicitly permitted for vitest / `astro check` / build (vitest.config.ts lives in astro/); all Success checks + Phase Verifications updated
- [x] **Test counts updated 89 → 90** (78 + 6 wikisource-parse + 6 selva) across WP-9, WP-10, phase-03 verification

## In Progress

- (none — book #2 complete; awaiting next task)

## Blocked / Needs Decision

- [?] (carried) **Widen `collect.url` in `astro/lighthouserc.json`?** — audit surface is `/` only; user decision pending

## Next Steps

1. (user-driven) Next book from idea/findings.md — pipeline now covers Gutenberg (fetch-book.mjs) AND Wikisource (fetch-wikisource.mjs)
2. (carried) Commit pending changes (astro.config.mjs site, index.astro JSON-LD, robots.txt, Layout.astro footer — UNCOMMITTED from 2026-09-05)
3. (carried, user decision) Widen `collect.url` to `/books/andanzas/`, `/words/pronouns/`, a chapter — then re-run `node astro/scripts/perf-check.mjs --full --runs 3 astro`
4. (carried) Next book from `idea/findings.md` — pipeline will cover Gutenberg AND Wikisource

## Key Decisions

- **Wikisource extraction (2026-09-06)**: story body = slice from first `<p>` after `ws-h3-medio` to the LAST `</p>` in the document; strip `<style>`/`<script>` blocks; drop caps restored from `<img alt>`; old orthography kept as-is
- (carried) Audit surface = home page only; SEO per-locale data; English removed (kept as data); multi-language = subdirectory + hreflang (locked); domain niceio.com; gloss model user-supplied `deepseek-v4-flash:0731-cloud`; v1 = reading + glosses only

## File Map

- `astro/scripts/data/wikisource/selva.json` — book config
- `astro/scripts/lib/wikisource-parse.mjs` + `astro/test/wikisource-parse.test.mjs` — tested Wikisource HTML extractor
- `astro/scripts/fetch-wikisource.mjs` — Wikisource fetch CLI
- `astro/src/data/books/selva/` — meta.json, 8 chapters, tokens/, glosses/, glosses.json
- `astro/src/lib/books.ts` — selva wired in
- `astro/test/data/books/selva.test.ts` — data shape + coverage tests
- `.pi/plans/add-cuentos-de-la-selva/_index.md` — FIXED: ws-data header claim, `cd astro` exception in Global Constraints
- `.pi/plans/add-cuentos-de-la-selva/phase-01-fetch-book.md` — FIXED: algorithm steps 3–4 (lastIndexOf in whole doc + guard), new step 7 (style/script strip), realistic fixture, 6 tests, `cd astro` commands
- `.pi/plans/add-cuentos-de-la-selva/phase-03-wire-and-verify.md` — FIXED: 90-test counts, `cd astro` commands
- `.tmp/ws-*.mjs`, `.tmp/ws-tortuga.json` — scratch verification scripts + live page dump (keep for the session)

## Gotchas / Warnings

- **Vitest + vite import analysis**: `new URL("<string literal>", import.meta.url)` in test files gets rewritten to the dev-server base (<http://localhost:3000>) → `fileURLToPath` throws "The URL must be of scheme file". Hoist the relative path into a variable first (`new URL(rel, import.meta.url)` works).
- **gloss.mjs `--data-dir` is CWD-relative** (NOT joined against ROOT despite the plan's claim) — pass `astro/src/data/books/selva` from the repo root.
- **Wikisource es parse HTML**: `id="ws-data"` is in the page HEADER (before the heading) — never anchor the body end on it. The first body `<p>` starts with a `<style>` block (dropinitial CSS) — must be stripped or CSS leaks into the text. Story body = last `<p>` block in the doc
- (carried) Audit surface is `/` only; LH 13.4.1 blind-spots; INP n/a on static pages; LCP = H1 text (zero `<img>` in src/); 5 islands all `client:load`; Windows chrome-launcher EPERM crash expected; IPA symbols trigger typos advisories; plan WP order load-bearing (Layout props); pronouns = 69 entries; JSX `className` vs Astro `class`; sticky footer `min-h-dvh`
