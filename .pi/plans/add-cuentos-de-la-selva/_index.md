---
plan: add-cuentos-de-la-selva
title: "Add Book #2: Cuentos de la selva (Quiroga)"
created: 2026-09-06
status: draft
executor-model: deepseek-v4-flash:0731-cloud
planner-model: deepseek-v4-flash:0731-cloud
---

# Plan: Add Book #2 — Cuentos de la selva (Horacio Quiroga, 1918)

## Objective

Add Horacio Quiroga's *Cuentos de la selva* (1918, public domain) as book #2 in the
app. The book is NOT on Project Gutenberg in Spanish — the clean proofread text
lives on **Wikisource es** (8 story pages, transcluded from the scanned 1918
edition). This plan: (1) builds a small Wikisource fetch script + tested HTML
extraction helper, (2) fetches the 8 stories into `src/data/books/selva/`,
(3) runs the existing gloss pipeline (tokenize + LLM batch-gloss via ollama),
(4) wires the book into `lib/books.ts`, (5) adds data-shape tests, (6) verifies
the full build. Result: 9 new pages (1 landing + 8 chapters), fully glossed,
tested, and green.

## Global Context

- Astro 7.3.1 + Tailwind 4.3 + React 19 islands, TypeScript strict, vitest 5.
  All in `astro/`. Node 22+.
- Book data is plain JSON under `astro/src/data/books/{id}/`:
  `meta.json` (BookMeta: id, lang, title, author, source, chapters[]),
  `chapters/{id}.txt` (raw text, NO title line — body only),
  `tokens/{id}.json` (Token[]: {t, w}), `glosses/{id}.json` (per-chapter
  GlossLibrary), `glosses.json` (full merged library).
- Existing book #1: `astro/src/data/books/andanzas/` (Unamuno, Gutenberg #78052).
  Its fetch script `astro/scripts/fetch-book.mjs` is Gutenberg-specific
  (START/END markers, ÍNDICE parsing) — NOT reusable for Wikisource.
- The gloss pipeline `astro/scripts/gloss.mjs` is GENERIC: it takes
  `--data-dir <dir>` and tokenizes every chapter in that dir's meta.json,
  batch-glosses distinct word forms via ollama, writes `tokens/`, `glosses/`,
  `glosses.json` incrementally (resumable after every batch). It requires
  `--model <name>` (or env `GLOSS_MODEL`) and exits 1 without one.
- Pages are generic: `astro/src/pages/books/[book]/index.astro` (landing) and
  `[slug].astro` (reader) use `import.meta.glob` over `data/books/*/` — a new
  book needs NO page changes. The home page Chooser reads the `books` array
  from `astro/src/lib/books.ts` — that file is the ONLY wiring point.
- SEO (`astro/src/lib/seo.ts`) is generic per-book functions — no changes.
- Test conventions: `astro/test/lib/*.test.ts` (vitest, TS), `astro/test/data/words/*.test.ts`
  (data shape), `astro/test/*.test.mjs` (pure script helpers, e.g.
  `gloss-parse.test.mjs`). Pure parsing logic lives in `astro/scripts/lib/`
  and is tested in `astro/test/`.
- The 8 stories (Índice order, verified 2026-09-06):
  1. La tortuga gigante
  2. Las medias de los flamencos
  3. El loro pelado
  4. La guerra de los yacarés
  5. La gama ciega
  6. Historia de dos cachorros de coatí y de dos cachorros de hombre
  7. El paso del Yabebirí
  8. La abeja haragana
- Wikisource page structure (verified): each story page's rendered HTML
  (`action=parse&prop=text`) contains a header nav div `id="headertemplate"`
  and a metadata div `id="ws-data"` — BOTH BEFORE the title heading
  `<div class="ws-div ws-h3-medio">TITLE</div>` (the ws-data div is in the
  page header, NOT a footer). The story body is the LAST block of `<p>...</p>`
  elements in the document. The first body paragraph starts with a `<style>`
  block (dropinitial CSS) followed by the drop-cap `<img alt="H" ...>` (the
  letter is in the alt attribute — the 1918 scan renders the initial letter as
  an image). Page-number markers are empty `<span class="pagenum">` spans.
  The 1918 edition uses old orthography ("fué", "vió", "El" for "él") —
  KEEP IT AS-IS; the gloss system's whole purpose is explaining surface forms.

## Global Constraints

- DO: run all commands from the repo root (`D:/coding/spain/learn-spanish-app`).
  The shell starts there; never `cd` into subdirectories — EXCEPT the
  vitest / `astro check` / build commands, which must run from `astro/`
  (vitest.config.ts lives there): `cd astro && <command>`. This is the one
  permitted exception.
- DO: write any scratch scripts to `.tmp/` under the repo root (never system
  `/tmp`, never outside the workspace). `.tmp/` is gitignored.
- DO: report gloss batch progress live in chat as it runs (user rule — no
  silent waiting on long jobs).
- DO NOT: deploy anything (no wrangler, no Cloudflare). Deployment is
  user-driven only.
- DO NOT: touch `astro/src/data/books/andanzas/` or any existing file other
  than the ones listed in this plan's File Map.
- DO NOT: add new npm dependencies. Scripts are plain ESM `.mjs`, Node
  built-ins only.
- DO NOT: modernize the 1918 orthography in the chapter text.
- DO NOT: modify `idea/routing.md` — no URL structure changes here.

## Conventions

- Book id: `selva`. Chapter ids: slugify (lowercase, accents stripped
  á→a é→e í→i ó→o ú→u ü→u ñ→n, non-alphanumerics → `-`, trim `-`).
  Expected slugs: `la-tortuga-gigante`, `las-medias-de-los-flamencos`,
  `el-loro-pelado`, `la-guerra-de-los-yacares`, `la-gama-ciega`,
  `historia-de-dos-cachorros-de-coati-y-de-dos-cachorros-de-hombre`,
  `el-paso-del-yabebiri`, `la-abeja-haragana`.
- Chapter titles = the Wikisource page titles verbatim (e.g. "El paso del
  Yabebirí" — NOT the Índice's "El Paso del Yabebirí").
- Chapter text files: body only, no title line (matches andanzas convention).
- JSX islands use `className`; Astro templates use `class` (not touched here).
- Tests: vitest, `describe`/`it`/`expect` from "vitest".

## Phases

| # | Name | File | WPs | Depends On |
|---|------|------|-----|------------|
| 1 | Fetch book from Wikisource | phase-01-fetch-book.md | WP-1–WP-4 | — |
| 2 | Tokenize + gloss (ollama) | phase-02-gloss.md | WP-5–WP-6 | Phase 1 |
| 3 | Wire into app + verify | phase-03-wire-and-verify.md | WP-7–WP-10 | Phase 2 |

## File Map

**Phase 1:**

- `astro/scripts/data/wikisource/selva.json` — CREATE — book config (id, title, author, source, lang, page titles)
- `astro/scripts/lib/wikisource-parse.mjs` — CREATE — pure `extractStoryText(html, pageTitle)` helper
- `astro/test/wikisource-parse.test.mjs` — CREATE — tests for the helper (fixture HTML)
- `astro/scripts/fetch-wikisource.mjs` — CREATE — CLI: fetch 8 pages via MediaWiki API, write meta.json + chapters/
- `astro/src/data/books/selva/meta.json` — CREATE (by script run)
- `astro/src/data/books/selva/chapters/*.txt` — CREATE (8 files, by script run)

**Phase 2:**

- `astro/src/data/books/selva/tokens/*.json` — CREATE (8 files, by gloss.mjs)
- `astro/src/data/books/selva/glosses/*.json` — CREATE (8 files, by gloss.mjs)
- `astro/src/data/books/selva/glosses.json` — CREATE (by gloss.mjs)

**Phase 3:**

- `astro/src/lib/books.ts` — MODIFY — add selvaMeta import + array entry
- `astro/test/data/books/selva.test.ts` — CREATE — data shape + gloss coverage tests
- `.pi/CONTEXT.md` — MODIFY — record book #2 completion

## Execution Instructions

This plan is designed for a cheap executor model. Execute as follows:

1. Read this `_index.md` fully — it provides global context and constraints.
2. Read `phase-01-fetch-book.md` and execute each work package **in order**.
3. After all WPs in a phase, run the Phase Verification commands.
4. If verification passes, proceed to the next phase.
5. If verification fails, fix the issue before moving on. Do not skip phases.
6. Each work package is self-contained — you should not need to read other
   phase files.

**Critical rules for the executor:**

- Do exactly what each work package says. Do not add features not in the plan.
- If a constraint says DO NOT, respect it absolutely.
- If you believe the plan has an error, note it and ask — do not improvise.
- Run the Success checks after every work package, not just at the end.
- The gloss run (WP-5) is the only long job: report batch progress in chat.
- If the ollama check in WP-5 fails, STOP and report — do not improvise a
  different model or a different pipeline.
