---
plan: spanish-reader-app
title: "Spanish Reader App — v1 (Unamuno, Andanzas y visiones españolas)"
created: 2026-02-14
status: draft
executor-model: deepseek-v4-flash:0731-cloud
planner-model: deepseek-v4-flash:0731-cloud
---

# Plan: Spanish Reader App — v1

## Objective

Build v1 of a static Spanish-learning web app in the `astro/` subdirectory of this repo. Stack: Astro 7 (latest — `@latest` resolves to 7.x, verified 7.3.1) + Tailwind 4 + React islands, mobile-first. Content: Miguel de Unamuno's *Andanzas y visiones españolas* (public domain, Project Gutenberg #78052). Every word/phrase in the text renders as a span; tapping (mobile) or hovering (desktop) shows a gloss popup: Russian translation, grammar explanation of the word form, IPA, lemma, POS, CEFR level, modern equivalent, false-friend warning, note. Glosses are generated at build time by an LLM pipeline (the model is supplied by the user at run time — the plan and scripts NEVER default to a model) and stored as per-chapter precompiled JSON libraries that each page loads with it. UI has a Russian/English toggle (glosses always in Russian).

## Global Context

**Repo layout (repo root = `D:/coding/spain/learn-spanish-app`):**

- `astro/` — the app (created by this plan). All app commands run as `cd astro && ...` from repo root.
- `idea/findings.md` — research notes (book copyright, architecture decisions).
- `.pi/` — agent context (do not touch).
- `.tmp/pg78052.txt` — the Gutenberg text, ALREADY downloaded this session (8555 lines). The fetch script uses it.

**Environment (verified):** Node v24.14.1, npm 11.11.0. Ollama API reachable at `http://localhost:11434` (models currently: `gemini-3-flash-preview:latest`, `qwq:32b` — the plan never hardcodes these; the user picks the model).

**Gutenberg text structure (verified by inspection):**

- Lines 1–27: Gutenberg header boilerplate.
- Line 28: `*** START OF THE PROJECT GUTENBERG EBOOK ANDANZAS Y VISIONES ESPAÑOLAS ***`.
- Lines 29–~60: `NOTAS DEL TRANSCRIPTOR` (transcriber notes).
- Then: title page, `OBRAS DEL AUTOR` bibliography, italic dedication, then `ÍNDICE` (table of contents, line 178) with 41 entries (PRÓLOGO + 40 essays), each entry = title + trailing page number; one entry wraps to a continuation line (`El Cristo yacente de Santa Clara (iglesia de la Cruz)` + `de Palencia`).
- Body starts at the all-caps line `PRÓLOGO` (~line 262). Each essay starts with an all-caps title line (e.g. `RECUERDO DE LA GRANJA DE MORERUELA`); one title spans two all-caps lines (`EL CRISTO YACENTE DE SANTA CLARA` + `(IGLESIA DE LA CRUZ) DE PALENCIA`). The signature line `MIGUEL DE UNAMUNO` appears after the prólogo (not a section start).
- Italics are marked `_text_`, small caps as plain caps, bold as `=text=` (transcriber markers to strip).
- Line 8205: `*** END OF THE PROJECT GUTENBERG EBOOK ANDANZAS Y VISIONES ESPAÑOLAS ***`, then footer boilerplate.
- Body word count: ~76,262 words; ~11,700 distinct word forms (so the gloss pass is ~235 batches of 50).

**Data layout (all under `astro/src/data/books/andanzas/`):**

- `meta.json` — `{ id, title, author, source, chapters: [{id, title}] }`
- `chapters/{id}.txt` — cleaned essay text
- `tokens/{id}.json` — token arrays `[{t, w}]` (t = surface text, w = gloss key or null)
- `glosses/{id}.json` — per-chapter gloss library `{ key: Gloss }`
- `glosses.json` — merged library (all keys)

**Gloss key normalization:** lowercase surface form, accents KEPT (`Habló` → `habló`). Phrase keys = lowercase phrase (`a pesar de`). Numbers and punctuation get `w: null` (no gloss).

**Note on `idea/findings.md`:** its §6 "Gloss model: deepseek-v4-flash" was a research note, NOT a decision — the user picks the model at run time (WP-7). The plan and scripts never default to a model.

## Global Constraints

- **DO NOT set, choose, or default an LLM model anywhere** — not in scripts, not in commands, not in prompts. `scripts/gloss.mjs` requires `--model <name>` or env `GLOSS_MODEL` and exits 1 with a clear message if neither is given. The user supplies the model at run time (WP-7).
- DO: all app code lives in `astro/`. Run commands as `cd astro && <cmd>` from repo root.
- DO: TypeScript strict (Astro 7 default — do not change tsconfig).
- DO: use only Node built-ins in scripts (`node:fs`, `node:path`, `fetch`). No axios, no tsx, no lodash.
- DO NOT: add dependencies beyond: `astro`, `react`, `react-dom`, `@astrojs/react`, `tailwindcss`, `@tailwindcss/vite` (all installed via scaffold) and `vitest` (dev, WP-5).
- DO: commit generated data (`chapters/`, `tokens/`, `glosses/`) — it is app content, not build output.
- DO NOT: deploy, push, or run `git push` (user handles pushes).
- DO: temp files only in `.tmp/` at repo root (never system temp).
- DO NOT: modify `idea/`, `.pi/`, or root `.gitignore` (except nothing — no changes needed there).

## Conventions

- **Commands:** always `cd astro && ...` (executor shell starts at repo root).
- **Scripts:** plain ESM JavaScript (`.mjs`) in `astro/scripts/`; shared logic in `astro/scripts/lib/`.
- **App code:** TypeScript in `astro/src/`; React islands in `astro/src/components/`; pages in `astro/src/pages/`.
- **Tests:** vitest, files in `astro/test/*.test.mjs` (plain ESM, import the `.mjs` modules).
- **i18n:** `src/lib/i18n.ts` — `strings` object with `ru`/`en` keys, `getLang()`/`setLang()` (localStorage key `lang`, default `ru`), `onLangChange(cb)` pub/sub. Gloss content is always Russian; only UI labels switch.
- **Footer:** every page footer includes `Made by CTDev` linking to `https://ctdev.dev/` with `target="_blank" rel="noopener noreferrer"`, styled `text-[0.65rem] text-stone-500 opacity-60 hover:opacity-100 hover:underline`.
- **Commits:** after each phase verification passes, commit: `git add astro/ && git commit -m "spanish-reader: phase N — <name>"`. Never push.

## Phases

| # | Name | File | WPs | Depends On |
| --- | --- | --- | --- | --- |
| 1 | Scaffold & Foundation | phase-01-scaffold-foundation.md | WP-1–WP-2 | — |
| 2 | Book Data & Tokenizer | phase-02-book-data-tokenizer.md | WP-3–WP-5 | Phase 1 |
| 3 | Gloss Pipeline | phase-03-gloss-pipeline.md | WP-6–WP-7 | Phase 2 |
| 4 | Reader UI | phase-04-reader-ui.md | WP-8–WP-10 | Phase 3 |

## Post-Build Polish (after Phase 4, user-driven — NOT executor work)

Run these as a separate stage once the app is stable; they are interactive skills, not plan WPs:

- `/skill:audit-add-test` — component tests for the Reader island (popup/sheet interaction), LangToggle, BookIntro
- `/skill:audit-lighthouse-loop` and `/skill:audit-perf` — performance gates against the final build

Deferred deliberately: audits need a finished, stable build — running them mid-build churns on findings that later phases invalidate. The plan's per-phase verification (build + check + tests + manual checklist) is the in-build gate.

## File Map

**Phase 1:**

- `astro/` — CREATE (scaffold: Astro 7 minimal + React + Tailwind 4)
- `astro/src/lib/types.ts` — CREATE — Gloss/Token/ChapterMeta/BookMeta/GlossLibrary types
- `astro/src/lib/i18n.ts` — CREATE — RU/EN UI strings + lang state
- `astro/src/layouts/Layout.astro` — CREATE — base layout (header, footer w/ CTDev credit, global.css)
- `astro/src/styles/global.css` — MODIFY — Tailwind import + reading styles
- `astro/src/components/LangToggle.tsx` — CREATE — RU/EN toggle island
- `astro/src/pages/index.astro` — MODIFY — placeholder home (Phase 1) → book home (WP-4)

**Phase 2:**

- `astro/scripts/fetch-book.mjs` — CREATE — Gutenberg clean + split into 41 essays
- `astro/src/data/books/andanzas/meta.json` — CREATE (generated)
- `astro/src/data/books/andanzas/chapters/{id}.txt` — CREATE (generated, 41 files)
- `astro/src/lib/books.ts` — CREATE — book registry (imports meta.json)
- `astro/src/components/BookIntro.tsx` — CREATE — RU/EN book description island
- `astro/scripts/lib/tokenize.mjs` — CREATE — tokenizer + longest-match phrase recognition
- `astro/test/tokenize.test.mjs` — CREATE — vitest tests
- `astro/package.json` — MODIFY — add vitest devDep + `test` script

**Phase 3:**

- `astro/scripts/data/phrases.json` — CREATE — seed phrase list (specified in WP-6)
- `astro/scripts/gloss.mjs` — CREATE — LLM gloss pipeline (model required, no default)
- `astro/scripts/lib/gloss-parse.mjs` — CREATE — pure batch-parse/merge helpers (tested)
- `astro/test/gloss-parse.test.mjs` — CREATE — vitest tests
- `astro/src/data/books/andanzas/tokens/{id}.json` — CREATE (generated, 41 files)
- `astro/src/data/books/andanzas/glosses/{id}.json` — CREATE (generated, 41 files)
- `astro/src/data/books/andanzas/glosses.json` — CREATE (generated, merged)

**Phase 4:**

- `astro/src/pages/books/andanzas/[slug].astro` — CREATE — chapter page (static spans + Reader island)
- `astro/src/components/Reader.tsx` — CREATE — delegated handler + tooltip/bottom-sheet popup

## Execution Instructions

This plan is designed for a cheap executor model. Execute as follows:

1. Read this `_index.md` fully — it provides global context and constraints.
2. Read `phase-01-scaffold-foundation.md` and execute each work package **in order**.
3. After all WPs in a phase, run the Phase Verification commands.
4. If verification passes, commit (see Conventions) and proceed to the next phase.
5. If verification fails, fix the issue before moving on. Do not skip phases.
6. **WP-7 requires the user's input (the LLM model name). Ask the user. Do not pick a model yourself. If the user provides none, stop and report.**

**Critical rules for the executor:**

- Do exactly what each work package says. Do not add features not in the plan.
- If a constraint says DO NOT, respect it absolutely.
- If you believe the plan has an error, note it and ask — do not improvise.
- Run the Success checks after every work package, not just at the end.
- Never invent an LLM model name. Never set GLOSS_MODEL yourself.
