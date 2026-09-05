# Project Rules: learn-spanish-app

## Tech Stack

- Astro 7.3.1 (latest) + Tailwind CSS 4.3 + React 19 (islands), mobile-first — INSTALLED in `astro/`
- TypeScript strict (Astro default), vitest 5 (dev) for `.mjs` script tests
- No backend, no runtime API keys; scripts are plain ESM `.mjs` (Node built-ins only, no tsx/axios/lodash)

## Architecture

- **Build-time gloss pipeline**: script downloads book → cleans → tokenizes → dedupes word forms → LLM batch-glosses with context sentences → commits `glosses.json` (word → {lemma, pos, ru, grammar, note})
- **Gloss pipeline resilience (plan v2)**: `glosses.json` is written incrementally after EVERY batch so an interrupted run resumes; up to 3 context sentences per key (first 3 distinct occurrences, located by case-insensitive `indexOf` — the tokenizer emits no positions); parse/merge logic lives in pure tested helpers (`scripts/lib/gloss-parse.mjs`: `parseBatchResponse`/`mergeGlosses`/`pendingKeys`)
- **Per-page precompiled gloss libraries** — each chapter page loads only its own words+phrases (inlined/small JSON); phrase recognition via longest-match ("a pesar de" = one unit). `import.meta.glob` eager in frontmatter is fine — it stays server-side; island props serialize per-page
- **Gloss schema (future-proof, all fields optional)**: lemma, pos, ipa, ru, grammar (STRING explaining THIS surface form, e.g. "pretérito imperfecto, 1ª/3ª pers. sing." — not an object), cefr, modern (archaic→modern), false_friend, note
- **Reader UI**: every word rendered as a span with `data-word`; ONE delegated event handler; popup on hover (desktop) / bottom-sheet on tap (mobile). Paragraphs preserved via `splitParagraphs` (2+ consecutive `\n` tokens = break) — never render a whole chapter in one `<p>`. Popup has `popupRef`; close-on-outside rules must exclude targets inside the popup (hovering the tooltip / tapping or scrolling inside the sheet must NOT close it). Glossable spans: `tabindex="0" role="button"`; Enter/Space opens
- **i18n**: `chapterCount(n, lang)` with `pluralRu(n, one, few, many)` — Russian plural rule: n%10==1 && n%100!=11 → one; n%10 in 2..4 && n%100 not in 12..14 → few; else many (41 → "41 глава", NOT "41 Главы")
- **Routing model (decision record `idea/routing.md` — read before touching URL structure)**: flat URLs — content language is DATA (`lang` field on BookMeta/WordCategory), never in URLs. Translation language = app setting (UI lang). Word lesson ids are per-language slugs (`/words/pronouns/` es, `/words/pronoms/` fr later). Chapter URLs `/books/andanzas/{slug}` are permanent — no `_redirects`. Source language is NOT a persistent setting (chooser sections only). `<html lang>` = content language on content pages (Layout `contentLang` prop + `data-content-lang` marker; `setLang` skips the lang override when the marker is present, so a UI switch can't clobber content lang). Glosses stay RU-only until the per-language gloss data task (routing.md §7)
- **URL restructure plan exists**: `.pi/plans/restructure-routing/` (11 WPs, 3 phases) — chooser at `/`, `/books/[book]/` landing, generic reader, `/words/[category]/` + pronouns lesson (69 entries, 9 groups, RU content). Reviewed + 5 fixes applied 2026-09-05 (WP-5/6 swap, setLang guard, contentLang from data). NOT yet executed
- Book data as plain JSON under `src/data/books/{id}/` (meta.json, chapters/, tokens/, glosses/) loaded via `import.meta.glob` — NOT content collections

## Design System

- Footer must include subtle 'Made by CTDev' credit linking to <https://ctdev.dev/> (target=_blank, rel=noopener noreferrer, ~0.65rem, muted, underline on hover). **RESTYLED 2026-09-05**: the old ~0.6 opacity failed contrast (2.26:1); user approved removing the opacity — the muted token alone passes 4.5:1 in both themes (stone-500 on white 4.72:1, stone-400 on stone-950 7.88:1). No opacity reduction on the credit anymore.
- **Standalone template lives in `template/`** (repo root, not astro/): `style.css` + `kitchen-sink.html` + `STYLE-GUIDE.md`. Design language = astro site's: stone neutrals + amber accent (amber-700 #b45309, stone-200 borders, white bg, system-ui, radius 4px)
- **Dark theme mechanism** (template): all colors are CSS custom properties; `[data-theme="dark"]` forces dark, `[data-theme="light"]` forces light, otherwise `@media (prefers-color-scheme: dark) :root:not([data-theme="light"])` follows the system
- **Contrast strategy** (template): light mode = 700-level semantic colors (emerald-700/amber-700/red-700/sky-700) so white button text passes 4.5:1; dark mode = 400-level colors with dark text via `--color-on-accent` (#ffffff light / #0c0a09 dark). Badges/alerts reuse the same tokens
- **Modal component**: closed by default (`display:none`), `.modal.open` shows it; kitchen-sink wires open/close/overlay/Esc + focus management (focus in on open, return to trigger on close)

## Active Constraints

- **Book #1: Unamuno, "Andanzas y visiones españolas" (1922)** — Gutenberg #78052 (clean text); **41 essays** (PRÓLOGO + 40), each essay = a chapter
- **Gloss model: USER-SUPPLIED at run time — NEVER defaulted.** `scripts/gloss.mjs` requires `--model <name>` or env `GLOSS_MODEL` and exits 1 without one. User's current pick: `deepseek-v4-flash:0731-cloud`
- **v1 scope: reading + glosses only** — known-words tracking, TTS audio, SRS = later phases
- **UI: Russian + English toggle** (glosses always in Russian)
- **Copyright**: public domain books ONLY in the public app. User's own modern book = private use only (no public deploy)
- **Audit skills (audit-add-test, audit-lighthouse-loop, audit-perf) run AFTER the build as a user-driven polish stage** — not executor WPs; audits need a stable build
- Temp/working files MUST be created in `.tmp/` under the repo root, never in system `/tmp/` or outside the workspace. `.tmp/` should be in `.gitignore`. Clean up with `rm -rf .tmp/` after use.
- **URL structure changes require updating `idea/routing.md` first** — it is the source of truth for routing & language handling
- **JSX convention**: React islands use `className` (see BookIntro.tsx); Astro templates use `class`
- **Never deploy unless the user explicitly asks in the current request**

## Lessons

- **Output verbosity (user rule)**: keep the normal verbose style — detailed progress updates, explanations, status reports in chat. Not more, not less. **Long-running jobs (e.g. the gloss pipeline): the user wants LIVE progress updates — report batch progress as it happens, don't wait silently for completion.**
- **Latest Astro is 7.3.1 (not 5.x)** — all APIs the plan uses (create-astro flags, `astro add tailwind`, `import.meta.glob`, `getStaticPaths`, `astro check`, JSON imports, `client:*`) are unchanged in v6/v7; Node 22+ required; `@latest` everywhere
- **The Astro minimal template ships NO `src/layouts/Layout.astro`** — only `src/pages/index.astro` + `src/styles/global.css`; a plan saying MODIFY a scaffolded Layout.astro is wrong, it must be CREATE
- **Body-only distinct word forms ≈ 11,761 → 236 batches of 50** — counting front matter inflates to ~12,270; measure body only (from PRÓLOGO to END marker)
- **The book has 41 essays, not 37** — verified against the actual Gutenberg text; the ÍNDICE has 41 entries
- One essay title spans two all-caps lines (`EL CRISTO YACENTE DE SANTA CLARA` + `(IGLESIA DE LA CRUZ) DE PALENCIA`) — title matching needs a two-line join fallback
- Index continuation logic: a line WITHOUT a trailing page number STARTS a wrapped entry (does not continue the previous one)
- Body has 48 all-caps lines but only 41 are titles (7 versalitas false positives: RECUERDO DE MALLORCA, EL CAMPO ES UNA METÁFORA, JUNTO A LA VIEJA COLEGIATA, Roman numerals I–IV) — always match against index titles, never split on all-caps lines alone
- **Plan review lesson: a "resumable" script that only writes its state at the end is not resumable** — persist incrementally (glosses.json after each batch)
- **Plan review lesson: WP ordering applies to EVERY new prop, not just the obvious ones** — a page passed `description` to Layout before the WP that added the prop → `astro check` ts(2322) (verified empirically with a probe page). When reordering WPs, update all cross-refs (contexts, Shared Context, CONTEXT.md gotchas). And: a static no-FOUC guard is bypassed by the runtime setter — guard `setLang` too (data-content-lang check)
- **Plan review lesson: hover/tap popups must exclude the popup element from close-on-outside logic** — capture-phase scroll listeners fire for scrolls inside the popup; mouseover fires when entering the popup
- **Plan review lesson: Russian pluralization needs a real rule** — "41 Главы" is wrong; use pluralRu (41 → "41 глава")
- **`api/tags` does NOT list `deepseek-v4-flash:0731-cloud`** (only gemini-3-flash-preview:latest, qwq:32b) but the chat endpoint ACCEPTS it — the local ollama proxies cloud models (response model name: `deepseek-v4-flash:0731`). `api/ps` shows nothing loaded for proxied models — NOT a sign of a dead pipeline. Verify a model works with a tiny `curl -m 30 http://localhost:11434/api/chat -d '{"model":"<name>","messages":[{"role":"user","content":"hi"}],"stream":false}'`
- **Subagent status display is misleading**: turns/ctx don't grow while a subagent is blocked in a long bash call — the child process does the work. Don't kill a subagent just because it looks idle; check the actual child process / output files first
- **Guardrail gotchas**: `taskkill //PID` gets mangled → use `powershell -Command "Stop-Process -Id N -Force"`. `cd astro && nohup ... > ../.tmp/...` trips the path guardrail → run from repo root: `node astro/scripts/...` + `.tmp/gloss.log` (scripts resolve their own paths via `__dirname`)
- **WP-3 fetch script**: the PRÓLOGO special case must advance `nextTitleIdx` past the index's first entry, else every section after the prólogo is missed
- **Tokenizer**: word regex must include digits (`[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9]+`) — a letter-only regex makes "all digits → null" dead code
- **`import.meta.glob` in Astro pages must live INSIDE `getStaticPaths()`** — the docs' Caution: getStaticPaths runs in its own isolated scope and can only reference file imports, not frontmatter variables. A frontmatter `const tokenFiles = import.meta.glob(...)` used only in getStaticPaths gets DROPPED by the compiler (no warning) → build fails with "tokenFiles is not defined". Move the glob calls into getStaticPaths (Vite still transforms them there).
- **Biome autofix** rewrites quotes; plan success checks may grep for exact quote style (e.g. `format: "json"`) — restore if biome flips it
- Bash guardrail blocks inline python with backslash regexes — write scratch scripts to `.tmp/` instead
- Don Quijote original (1605) is archaic 17th-century Spanish — hard even for natives; not a learner's first book
- Platero y yo (Jiménez, 1914): PD in US, but EU copyright until 2029 — avoid for public sites
- Lorca: legally PD (died 1936) but estate is litigious — takedown risk
- Modern Quijote adaptations (Trapiello 2004, Anaya/Edelsa, Navarro Durán) are all copyrighted
- PD adapted Quijote exists: Oca y Merino 1916 "acomodado para las escuelas primarias" — Wikisource scan, needs OCR
- Free legal modern content: UNAM CEPE graded readers (B1–B2 PDFs), CVC "Lecturas paso a paso", Vikidia (children's encyclopedia, free license)
- **ADA audit (template)**: axe-core 4.10.2 via CDN works on file:// pages (Lighthouse refuses file:// — INVALID_URL). Landmark rules that bite: `<aside>` must be top-level (not nested in main), navs need unique aria-labels, no nested `<main>`. axe's heading-order rule does NOT flag h2→h1 decreases (only skips) — check manually. axe incomplete ≠ violation (placeholder text, cross-origin iframes, demo videos are untestable)
- **CSS formatter rewrites** style.css/kitchen-sink.html (comments to own lines, 1-space indent) — re-read files before editing; oldText from memory drifts
- Blasco Ibáñez (died 1928) = PD + modern-feeling prose; Pío Baroja PD in EU from Jan 2027

## Dependencies

- Installed in `astro/`: astro 7.3.1, react 19, react-dom 19, @astrojs/react 6, tailwindcss 4.3, @tailwindcss/vite 4.3, @astrojs/check, typescript 6, vitest 5
- Scripts: plain `.mjs` (Node built-ins only). No other deps allowed by plan

<!-- BEGIN astro-pi-workflow:workflow -->
<!-- Seeded by astro-pi-workflow. This block is yours to customize; re-running
     install.mjs site will not modify it. Delete this BEGIN line to have it
     re-seeded fresh on the next install. -->
## Workflow checkpoints (astro-pi-workflow)

1. Rules (this file) — live; constrain work as it happens.
2. audit-perf skill — run before declaring a page/island/image task done.
<!-- END astro-pi-workflow:workflow -->
