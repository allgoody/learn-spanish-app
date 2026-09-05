# Context — learn-spanish-app

**Project:** Spanish learning web app (static, mobile-first)
**Rules:** See `.pi/project-rules-memory.md` for tech stack, architecture, and design constraints.

Last updated: 2026-09-05

## Current Task

Plan `spanish-reader-app` reviewed (2nd pass), issues fixed, updated for latest Astro 7. Awaiting user go-ahead to commit → execute via `/skill:implement spanish-reader-app`.

## Completed This Session

- [x] Second plan review pass — verified every claim against the real Gutenberg text (`.tmp/pg78052.txt`): 41 index entries, wrapped entry, two-line body title, all-caps false positives, CRLF line endings, word counts
- [x] Fixed review findings: Layout.astro MODIFY→CREATE (minimal template ships none), WP-8 build check DEFERRED to WP-9, WP-10 test count 6→10, WP-1 repo-root description
- [x] Verified latest Astro (7.3.1) against official docs — all plan APIs unchanged; updated plan text "Astro 5" → "Astro 7 (latest)"
- [x] Batch estimate re-measured: ~11,761 body-only keys → 236 batches — plan's ~11,700/~235 was right (first count included front matter)

## In Progress

- [ ] Plan patches committed → execute (`/skill:implement spanish-reader-app`)

## Blocked / Needs Decision

- [?] User must say "commit it" — plan files modified, uncommitted
- [?] WP-7 (gloss generation) requires the user to name the ollama model at run time — the plan/scripts NEVER default a model

## Next Steps

1. Commit the patched plan (user's call)
2. Execute: read `.pi/plans/spanish-reader-app/_index.md`, then phase by phase
3. At WP-7: ask the user which model to use (current ollama tags: gemini-3-flash-preview:latest, qwq:32b)
4. After Phase 4: post-build polish stage — audit skills, user-driven

## Key Decisions

- **Astro 7 (latest, verified 7.3.1)** — `@latest` everywhere; all APIs the plan uses are unchanged from Astro 5; Node 22+ required (have 24.14.1)
- **Book #1: Unamuno, "Andanzas y visiones españolas" (1922)** — Gutenberg #78052; **41 essays** (PRÓLOGO + 40), each = a chapter
- **Gloss model: USER-SUPPLIED at run time — NO default anywhere.** Script requires `--model` or `GLOSS_MODEL`, exits 1 otherwise
- **v1 scope: reading + glosses only** — known-words, TTS, SRS later
- **UI: Russian + English toggle** (glosses always in Russian)
- **Build-time annotation** — LLM glosses every unique word form with context; committed as JSON; no backend
- **Per-page precompiled gloss libraries** — each chapter page loads only its own words+phrases
- (earlier session) incremental `glosses.json` writes, 3 contexts/key, `gloss-parse.mjs` + 4 tests, `splitParagraphs`, `popupRef` guards, keyboard access, `chapterCount`/`pluralRu`, Layout `title` prop, 37→41 typos, 5-random-gloss quality sample

## File Map

- `.pi/plans/spanish-reader-app/_index.md` — PATCHED this session: Astro 7 (latest) in Objective/constraints/File Map
- `.pi/plans/spanish-reader-app/phase-01-scaffold-foundation.md` — PATCHED: Layout.astro CREATE (minimal template ships none), repo-root description, Astro 7 context
- `.pi/plans/spanish-reader-app/phase-04-reader-ui.md` — PATCHED: WP-8 build check DEFERRED to WP-9, WP-10 "10 tests"
- `.pi/plans/spanish-reader-app/phase-02-book-data-tokenizer.md`, `phase-03-gloss-pipeline.md` — unchanged this session (patched in earlier session)
- `idea/findings.md` — research + decisions (unchanged; §6 model pick is a note, NOT a decision)
- `.tmp/pg78052.txt` — Gutenberg source text (keep for the fetch script)

## Gotchas / Warnings

- **Latest Astro is 7.3.1, not 5.x** — plan text updated; `npm create astro@latest` resolves to 7.x
- **The minimal template ships NO `src/layouts/Layout.astro`** — WP-2 creates it
- **The book has 41 essays, not 37** — plan files all say 41 now
- One essay title spans two all-caps lines: `EL CRISTO YACENTE DE SANTA CLARA` + `(IGLESIA DE LA CRUZ) DE PALENCIA` — two-line join fallback in WP-3 step 6
- Index continuation logic: a line WITHOUT a trailing page number STARTS a wrapped entry (does not continue the previous one)
- Body has 48 all-caps lines but only 41 are titles (7 versalitas false positives: RECUERDO DE MALLORCA, EL CAMPO ES UNA METÁFORA, Roman numerals I–IV) — index-driven matching handles this; never split on all-caps lines alone
- **deepseek-v4-flash:0731-cloud is NOT in the current ollama tags** (only gemini-3-flash-preview:latest, qwq:32b) — the user picks the model
- Bash guardrail blocks inline node/python with backslash regexes — write scratch scripts to `.tmp/` instead
- Plan review lesson: `import.meta.glob` eager in frontmatter is fine (server-side; island props serialize per-page) — do NOT "fix" it to non-eager
