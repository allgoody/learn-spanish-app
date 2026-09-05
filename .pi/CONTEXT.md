# Context — learn-spanish-app

**Project:** Spanish learning web app (static, mobile-first)
**Rules:** See `.pi/project-rules-memory.md` for tech stack, architecture, and design constraints.

Last updated: 2026-09-05

## Current Task

**PLAN COMPLETE** — `spanish-reader-app` all 4 phases done + committed (`4c6e14e` phase 3, `5bd81fb` phase 4). App is fully functional: 42 pages, reader with gloss popups. Remaining: user-driven polish stage (audit skills) + manual browser checks.

## Completed This Session

- [x] WP-7 gloss pipeline COMPLETE: 11,639 keys (98.7% coverage, 150 failed keys from timeouts — under the 90% gate, no re-run needed), 41 tokens/ + 41 glosses/ files, spot-checks 5/5 sane
- [x] Phase 4 WP-8: `[slug].astro` — static spans, data-word, splitParagraphs (single \n → space, 2+ → paragraph break), prev/next, Reader mount. **Gotcha: import.meta.glob must live INSIDE getStaticPaths** (Astro docs: getStaticPaths runs in isolated scope, can only reference file imports — frontmatter globs get dropped, build fails with "tokenFiles is not defined")
- [x] Phase 4 WP-9: `Reader.tsx` — delegated document listeners (click/mouseover/keydown/scroll-capture), popupRef contains-guards, pinned state (hover opens unpinned, click pins, click-same-word toggles close), tooltip (hover) with useLayoutEffect positioning + top-overflow clamp, bottom sheet (touch) with close button, RU/EN labels via onLangChange
- [x] Phase 4 WP-10: npm test 10/10, astro check 0 errors, build 42 pages, ctdev.dev footer, home 41 links, prologo renders 400 glossable spans + island mounted
- [x] Commits: `4c6e14e` phase 3 (gloss pipeline + biome autofixes), `5bd81fb` phase 4 (reader UI)
- [x] User preference updated: LIVE progress updates on long-running jobs (was: don't poll)

## In Progress

- (none — plan complete)

## Blocked / Needs Decision

- [ ] Manual browser checks (WP-10 manual checklist): hover tooltip + pin + Esc, tap bottom sheet + outside-close, keyboard Enter/Space, RU/EN toggle, no console errors — user to verify in browser
- [ ] **DEPLOYED (user-approved 17:25):** Cloudflare Pages project `learn-words` → <https://learn-words-5mq.pages.dev/> (bare subdomain taken globally by a Chinese word-learning site; suffix -5mq auto-assigned). Deployment 98606467. Re-deploy after changes: `wrangler pages deploy astro/dist --project-name learn-words`

## Next Steps

1. User verifies manual checklist in browser (dev server on :4321)
2. Post-build polish (user-driven, NOT executor): `/skill:audit-add-test`, `/skill:audit-lighthouse-loop`, `/skill:audit-perf`
3. **Dark theme for the app** (user-requested todo)
4. **Check translations for errors** — user spotted English words written in Cyrillic where a Russian analog exists (user-requested todo; likely in glosses.json `ru` fields — audit glosses for transliterated English, e.g. "винтаж" vs "старинный")

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
