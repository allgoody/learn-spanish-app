# Context — learn-spanish-app

**Project:** Spanish learning web app (static, mobile-first)
**Rules:** See `.pi/project-rules-memory.md` for tech stack, architecture, and design constraints.

Last updated: 2026-09-05

## Current Task

Executing plan `spanish-reader-app` (`.pi/plans/spanish-reader-app/`) via `/skill:implement`. Phases 1–2 done + committed. Phase 3 WP-6 done. **WP-7 gloss generation is RUNNING IN THE BACKGROUND** — see In Progress.

## Completed This Session

- [x] Phase 1 (committed `75c48ef`): Astro 7.3.1 scaffold (minimal + react + tailwind), `src/lib/types.ts`, `src/lib/i18n.ts` (RU/EN strings, `chapterCount`/`pluralRu`, `getLang`/`setLang`/`onLangChange`), `src/layouts/Layout.astro` (CTDev footer), `LangToggle.tsx`, placeholder home
- [x] Phase 2 (committed `c24e381`): `scripts/fetch-book.mjs` → 41 chapters (76,143 words) + `meta.json`; `src/lib/books.ts` + `BookIntro.tsx` + book home page; `scripts/lib/tokenize.mjs` + 6 vitest tests (all pass)
- [x] Phase 3 WP-6: `scripts/data/phrases.json` (40 phrases), `scripts/gloss.mjs` (model REQUIRED, no default; ollama chat, format json, 120s timeout, 3×5s network retry, batch re-try once, incremental `glosses.json` after every batch, resumable), `scripts/lib/gloss-parse.mjs` + 4 tests (10/10 total pass)
- [x] User chose gloss model: **deepseek-v4-flash:0731-cloud** (via subagent with `:max` reasoning, then user asked to kill the subagent and run it directly — done)

## In Progress

- [ ] **WP-7 gloss pipeline running**: `nohup node astro/scripts/gloss.mjs --model deepseek-v4-flash:0731-cloud > .tmp/gloss.log 2>&1 &` (started ~10:30, PID was 2702). Last check: batch 19/207, ~2,350/~11,700 keys. **User preference: do NOT poll the log — report only when it finishes.** Check with: `tail .tmp/gloss.log` + count keys in `astro/src/data/books/andanzas/glosses.json`. If the process died, re-run the same command (resumable).

## Blocked / Needs Decision

- [?] WP-7 checks after the run: coverage ≥ 90% (else report failed keys, ask user about re-run with different model), spot-check 5 random glosses (ru + lemma sane)
- [?] If coverage < 90% or glosses look systematically wrong → ask user before re-running

## Next Steps

1. When pipeline finishes: run WP-7 success checks (41 tokens/, 41 glosses/, glosses.json exists, ≥10,000 keys, coverage ≥ 90%, spot checks)
2. Phase 3 verification (`npm run build`) → commit `spanish-reader: phase 3 — gloss pipeline` (also sweeps in uncommitted biome quote-style autofixes + WP-6 files)
3. Phase 4: WP-8 `src/pages/books/andanzas/[slug].astro` (static spans, `data-word`, `splitParagraphs`, prev/next), WP-9 `src/components/Reader.tsx` (delegated handler, tooltip/bottom-sheet, popupRef guards, keyboard access), WP-10 final verification → commit
4. Post-build polish (user-driven, NOT executor): `/skill:audit-add-test`, `/skill:audit-lighthouse-loop`, `/skill:audit-perf`

## Key Decisions

- **Gloss model: USER-SUPPLIED, never defaulted** — user picked `deepseek-v4-flash:0731-cloud` (accepted by local ollama chat endpoint even though `api/tags` doesn't list it — it's cloud-proxied)
- **Subagent approach abandoned** — user killed the delegate subagent (its status display looks frozen while blocked in a long bash call; the work happens in the child process). Running the pipeline directly via nohup instead.
- **Astro 7.3.1** (latest), React 19, Tailwind 4.3, vitest 5 — all installed
- **v1 scope: reading + glosses only** — known-words, TTS, SRS later
- **UI: Russian + English toggle** (glosses always in Russian)

## File Map

- `astro/scripts/gloss.mjs` — gloss pipeline (WP-6, uncommitted)
- `astro/scripts/lib/gloss-parse.mjs` + `astro/test/gloss-parse.test.mjs` — parse/merge helpers + tests (uncommitted)
- `astro/scripts/data/phrases.json` — 40 seed phrases (uncommitted)
- `astro/src/data/books/andanzas/glosses.json` — incremental gloss library, growing (uncommitted)
- `.tmp/gloss.log` — pipeline output log (progress lines `batch i/N — glossed so far: X`)
- `.tmp/pg78052.txt` — Gutenberg source (keep)
- `.pi/plans/spanish-reader-app/` — the plan (phases 1–4, 10 WPs)

## Gotchas / Warnings

- **`api/tags` does NOT list `deepseek-v4-flash:0731-cloud`** (only gemini-3-flash-preview:latest, qwq:32b) but the chat endpoint ACCEPTS it (cloud-proxied; response model name is `deepseek-v4-flash:0731`). `api/ps` shows nothing loaded for proxied models — not a sign of a dead pipeline.
- **Subagent status display is misleading**: turns/ctx don't grow while blocked in a long bash call — the child process does the work. Don't kill a subagent just because it looks idle.
- **Guardrail gotchas**: `taskkill //PID` gets mangled → use `powershell -Command "Stop-Process -Id N -Force"`. `cd astro && nohup ... > ../.tmp/...` trips the path guardrail → run from repo root: `node astro/scripts/...` + `.tmp/gloss.log` (script resolves its own paths via `__dirname`).
- **WP-3 bug fixed**: the PRÓLOGO special case must advance `nextTitleIdx` past the index's first entry, else every section after the prólogo is missed.
- **Tokenizer**: word regex must include digits (`[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9]+`) — the plan's letter-only regex made "all digits → null" dead code; test 6 requires `1911` as one token.
- **Biome autofix** rewrites quotes (`'json'` → `"json"`); WP-6's success check greps for `format: "json"` — restore double quotes if biome flips it.
- Uncommitted diffs on phase 1/2 files are biome quote-style autofixes only (cosmetic).
- Bash guardrail blocks inline node/python with backslash regexes — write scratch scripts to `.tmp/` instead.
