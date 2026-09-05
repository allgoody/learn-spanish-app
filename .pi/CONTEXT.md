# Context — learn-spanish-app

**Project:** Spanish learning web app (static, mobile-first)
**Rules:** See `.pi/project-rules-memory.md` for tech stack, architecture, and design constraints.

Last updated: 2026-09-05

## Current Task

Plan reviewed and patched (all 5 files, uncommitted). Awaiting user go-ahead to commit → execute via `/skill:implement spanish-reader-app`.

## Completed This Session

- [x] Full plan review (`.pi/plans/spanish-reader-app/`) — verified text-processing claims against the actual Gutenberg text; found 13 issues
- [x] User validated all points; time-estimate point (WP-7 "takes minutes") removed per user — they don't care about runtime
- [x] Patched all 5 plan files (see Key Decisions / File Map for the changes)
- [x] Answered open question: audit skills (audit-add-test, audit-lighthouse-loop, audit-perf) DEFERRED to a post-build polish stage — added "Post-Build Polish" section to `_index.md`; they are user-driven, not executor WPs

## In Progress

- [ ] Plan patches committed → execute (`/skill:implement spanish-reader-app`)

## Blocked / Needs Decision

- [?] User must say "commit it" (or review the diff first) — 5 plan files are modified, uncommitted
- [?] WP-7 (gloss generation) requires the user to name the ollama model at run time — the plan/scripts NEVER default a model

## Next Steps

1. Commit the patched plan (user's call)
2. Execute: read `.pi/plans/spanish-reader-app/_index.md`, then phase by phase
3. At WP-7: ask the user which model to use (current ollama tags: gemini-3-flash-preview:latest, qwq:32b)
4. After Phase 4: post-build polish stage — audit skills, user-driven

## Key Decisions

- **Book #1: Unamuno, "Andanzas y visiones españolas" (1922)** — Gutenberg #78052; **41 essays** (PRÓLOGO + 40), each = a chapter
- **Gloss model: USER-SUPPLIED at run time — NO default anywhere.** Script requires `--model` or `GLOSS_MODEL`, exits 1 otherwise
- **v1 scope: reading + glosses only** — known-words, TTS, SRS later
- **UI: Russian + English toggle** (glosses always in Russian)
- **Build-time annotation** — LLM glosses every unique word form with context; committed as JSON; no backend
- **Per-page precompiled gloss libraries** — each chapter page loads only its own words+phrases
- **Plan review fixes (this session):** incremental `glosses.json` writes (resume actually works); up to 3 context sentences per key (homonyms); `gloss-parse.mjs` lib + 4 tests (10 total); `splitParagraphs` (paragraphs preserved); `popupRef` guards (tooltip/sheet don't self-close); keyboard access (tabindex + Enter/Space); `chapterCount`/`pluralRu` ("41 глава", not "41 Главы"); Layout `title` prop; "37"→"41" typos; 5-random-gloss quality sample
- **Deliberately left:** book description in i18n strings (move to meta.json when book #2 arrives); Roman numerals get glossed (regex skip would false-positive on "mi"/"mil"/"vi")

## File Map

- `.pi/plans/spanish-reader-app/_index.md` — plan overview; PATCHED: Post-Build Polish section, findings.md model note, gloss-parse files
- `.pi/plans/spanish-reader-app/phase-01-scaffold-foundation.md` — PATCHED: i18n keys (dropped prev/next/chapters), chapterCount+pluralRu, Layout title prop
- `.pi/plans/spanish-reader-app/phase-02-book-data-tokenizer.md` — PATCHED: 37→41, BookIntro uses chapterCount, "41 глава" check
- `.pi/plans/spanish-reader-app/phase-03-gloss-pipeline.md` — PATCHED: incremental writes, 3 contexts/key, gloss-parse lib+tests, prompt template, quality sample
- `.pi/plans/spanish-reader-app/phase-04-reader-ui.md` — PATCHED: splitParagraphs, tabindex/role, popupRef guards, keyboard, role="dialog"
- `idea/findings.md` — research + decisions (unchanged; §6 model pick is a note, NOT a decision)
- `.tmp/pg78052.txt` — Gutenberg source text (keep for the fetch script)

## Gotchas / Warnings

- **The book has 41 essays, not 37** — plan files all say 41 now
- One essay title spans two all-caps lines: `EL CRISTO YACENTE DE SANTA CLARA` + `(IGLESIA DE LA CRUZ) DE PALENCIA` — two-line join fallback in WP-3 step 6
- Index continuation logic: a line WITHOUT a trailing page number STARTS a wrapped entry (does not continue the previous one)
- Body has 48 all-caps lines but only 41 are titles (7 versalitas false positives: RECUERDO DE MALLORCA, EL CAMPO ES UNA METÁFORA, JUNTO A LA VIEJA COLEGIATA, Roman numerals I–IV) — index-driven matching handles this; never split on all-caps lines alone
- **deepseek-v4-flash:0731-cloud is NOT in the current ollama tags** (only gemini-3-flash-preview:latest, qwq:32b) — the user picks the model
- Bash guardrail blocks inline python with backslash regexes — write scratch scripts to `.tmp/` instead
- Plan review lesson: `import.meta.glob` eager in frontmatter is fine (server-side; island props serialize per-page) — do NOT "fix" it to non-eager
