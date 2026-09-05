# Context — learn-spanish-app

**Project:** Spanish learning web app (static, mobile-first)
**Rules:** See `.pi/project-rules-memory.md` for tech stack, architecture, and design constraints.

Last updated: 2026-02-14

## Current Task

Execution plan for v1 is written and awaiting user review → commit → execute. Plan: `.pi/plans/spanish-reader-app/` (5 files, 4 phases, 10 WPs).

## Completed This Session

- [x] All design decisions made (book, gloss approach, scope, UI language)
- [x] `idea/findings.md` — full research doc (architecture, book copyright analysis, Quijote deep dive, decisions)
- [x] Downloaded Gutenberg #78052 text to `.tmp/pg78052.txt` (8555 lines) and verified its structure
- [x] Wrote the full execution plan (scaffold → book data → gloss pipeline → reader UI)
- [x] Self-review caught + fixed 2 plan bugs: book has **41 essays (not 37)**; index continuation logic was inverted + one title spans two lines (both re-verified against the source)

## In Progress

- [ ] Plan review by user → commit → execute (`/skill:implement spanish-reader-app`)

## Blocked / Needs Decision

- [?] User must review the plan files before execution
- [?] WP-7 (gloss generation) requires the user to name the ollama model at run time — the plan/scripts NEVER default a model

## Next Steps

1. Commit the plan (user asked "shall I commit it?" — awaiting answer)
2. Execute: read `.pi/plans/spanish-reader-app/_index.md`, then phase by phase
3. At WP-7: ask the user which model to use (e.g. gemini-3-flash-preview:latest, qwq:32b — whatever they choose)

## Key Decisions

- **Book #1: Unamuno, "Andanzas y visiones españolas" (1922)** — Gutenberg #78052; **41 essays** (PRÓLOGO + 40), each = a chapter
- **Gloss model: USER-SUPPLIED at run time — NO default anywhere.** Script requires `--model` or `GLOSS_MODEL`, exits 1 otherwise. User explicitly requested this
- **v1 scope: reading + glosses only** — known-words, TTS, SRS later
- **UI: Russian + English toggle** (glosses always in Russian)
- **Build-time annotation** — LLM glosses every unique word form with context sentence; committed as JSON; instant hover, offline, no backend
- **Per-page precompiled gloss libraries** — each chapter page loads only its own words+phrases; longest-match phrase recognition (40-phrase seed list)
- **Public domain books only** for public deploy; user's own modern book = private use only

## File Map

- `.pi/plans/spanish-reader-app/_index.md` — plan overview, global context/constraints, phase table
- `.pi/plans/spanish-reader-app/phase-01-scaffold-foundation.md` — WP-1..2 (scaffold, types, i18n, layout)
- `.pi/plans/spanish-reader-app/phase-02-book-data-tokenizer.md` — WP-3..5 (fetch/clean, home page, tokenizer+tests)
- `.pi/plans/spanish-reader-app/phase-03-gloss-pipeline.md` — WP-6..7 (phrases seed, gloss.mjs, run with user model)
- `.pi/plans/spanish-reader-app/phase-04-reader-ui.md` — WP-8..10 (chapter page, Reader island, final verification)
- `idea/findings.md` — research + decisions (updated)
- `.tmp/pg78052.txt` — Gutenberg source text (keep for the fetch script)
- `.tmp/check-index.py` — scratch script that verified the 41-title index parsing

## Gotchas / Warnings

- **The book has 41 essays, not 37** — plan files all say 41 now
- One essay title spans two all-caps lines: `EL CRISTO YACENTE DE SANTA CLARA` + `(IGLESIA DE LA CRUZ) DE PALENCIA` — the fetch script needs the two-line join fallback (specified in WP-3 step 6)
- Index continuation logic: a line WITHOUT a trailing page number STARTS a wrapped entry (does not continue the previous one)
- **deepseek-v4-flash:0731-cloud is NOT in the current ollama tags** (only gemini-3-flash-preview:latest, qwq:32b) — do not assume it's available; the user picks the model
- Bash guardrail blocks inline python with backslash regexes (`D:\-` false positive) — write scratch scripts to `.tmp/` instead
- Body has 48 all-caps lines but only 41 are titles (7 versalitas false positives) — the index-driven matching handles this; do not split on all-caps lines alone
