# Project Rules: learn-spanish-app

## Tech Stack

- Astro 7 (latest, verified 7.3.1) + Tailwind CSS 4 + React (islands), mobile-first
- No backend, no runtime API keys

## Architecture

- **Build-time gloss pipeline**: script downloads book → cleans → tokenizes → dedupes word forms → LLM batch-glosses with context sentences → commits `glosses.json` (word → {lemma, pos, ru, grammar, note})
- **Gloss pipeline resilience (plan v2)**: `glosses.json` is written incrementally after EVERY batch so an interrupted run resumes; up to 3 context sentences per key (first 3 distinct occurrences, located by case-insensitive `indexOf` — the tokenizer emits no positions); parse/merge logic lives in pure tested helpers (`scripts/lib/gloss-parse.mjs`: `parseBatchResponse`/`mergeGlosses`/`pendingKeys`)
- **Per-page precompiled gloss libraries** — each chapter page loads only its own words+phrases (inlined/small JSON); phrase recognition via longest-match ("a pesar de" = one unit). `import.meta.glob` eager in frontmatter is fine — it stays server-side; island props serialize per-page
- **Gloss schema (future-proof, all fields optional)**: lemma, pos, ipa, ru, grammar (STRING explaining THIS surface form, e.g. "pretérito imperfecto, 1ª/3ª pers. sing." — not an object), cefr, modern (archaic→modern), false_friend, note
- **Reader UI**: every word rendered as a span with `data-word`; ONE delegated event handler; popup on hover (desktop) / bottom-sheet on tap (mobile). Paragraphs preserved via `splitParagraphs` (2+ consecutive `\n` tokens = break) — never render a whole chapter in one `<p>`. Popup has `popupRef`; close-on-outside rules must exclude targets inside the popup (hovering the tooltip / tapping or scrolling inside the sheet must NOT close it). Glossable spans: `tabindex="0" role="button"`; Enter/Space opens
- **i18n**: `chapterCount(n, lang)` with `pluralRu(n, one, few, many)` — Russian plural rule: n%10==1 && n%100!=11 → one; n%10 in 2..4 && n%100 not in 12..14 → few; else many (41 → "41 глава", NOT "41 Главы")
- Book data as plain JSON under `src/data/books/{id}/` (meta.json, chapters/, tokens/, glosses/) loaded via `import.meta.glob` — NOT content collections

## Design System

- Footer must include subtle 'Made by CTDev' credit linking to <https://ctdev.dev/> (target=_blank, rel=noopener noreferrer, ~0.65rem, muted, ~0.6 opacity, underline on hover)

## Active Constraints

- **Book #1: Unamuno, "Andanzas y visiones españolas" (1922)** — Gutenberg #78052 (clean text); **41 essays** (PRÓLOGO + 40), each essay = a chapter
- **Gloss model: USER-SUPPLIED at run time — NEVER defaulted.** `scripts/gloss.mjs` requires `--model <name>` or env `GLOSS_MODEL` and exits 1 without one. The user chooses the model (deepseek-v4-flash was the original pick but is NOT in current ollama tags)
- **v1 scope: reading + glosses only** — known-words tracking, TTS audio, SRS = later phases
- **UI: Russian + English toggle** (glosses always in Russian)
- **Copyright**: public domain books ONLY in the public app. User's own modern book = private use only (no public deploy)
- **Audit skills (audit-add-test, audit-lighthouse-loop, audit-perf) run AFTER the build as a user-driven polish stage** — not executor WPs; audits need a stable build
- Temp/working files MUST be created in `.tmp/` under the repo root, never in system `/tmp/` or outside the workspace. `.tmp/` should be in `.gitignore`. Clean up with `rm -rf .tmp/` after use.
- Never deploy unless the user explicitly asks in the current request

## Lessons

- **Latest Astro is 7.3.1 (not 5.x)** — all APIs the plan uses (create-astro flags, `astro add tailwind`, `import.meta.glob`, `getStaticPaths`, `astro check`, JSON imports, `client:*`) are unchanged in v6/v7; Node 22+ required; `@latest` everywhere
- **The Astro minimal template ships NO `src/layouts/Layout.astro`** — only `src/pages/index.astro` + `src/styles/global.css`; a plan saying MODIFY a scaffolded Layout.astro is wrong, it must be CREATE
- **Body-only distinct word forms ≈ 11,761 → 236 batches of 50** — counting front matter inflates to ~12,270; measure body only (from PRÓLOGO to END marker)
- **The book has 41 essays, not 37** — verified against the actual Gutenberg text; the ÍNDICE has 41 entries
- One essay title spans two all-caps lines (`EL CRISTO YACENTE DE SANTA CLARA` + `(IGLESIA DE LA CRUZ) DE PALENCIA`) — title matching needs a two-line join fallback
- Index continuation logic: a line WITHOUT a trailing page number STARTS a wrapped entry (does not continue the previous one)
- Body has 48 all-caps lines but only 41 are titles (7 versalitas false positives: RECUERDO DE MALLORCA, EL CAMPO ES UNA METÁFORA, JUNTO A LA VIEJA COLEGIATA, Roman numerals I–IV) — always match against index titles, never split on all-caps lines alone
- **Plan review lesson: a "resumable" script that only writes its state at the end is not resumable** — persist incrementally (glosses.json after each batch)
- **Plan review lesson: hover/tap popups must exclude the popup element from close-on-outside logic** — capture-phase scroll listeners fire for scrolls inside the popup; mouseover fires when entering the popup
- **Plan review lesson: Russian pluralization needs a real rule** — "41 Главы" is wrong; use pluralRu (41 → "41 глава")
- deepseek-v4-flash:0731-cloud is NOT in the current ollama tags (only gemini-3-flash-preview:latest, qwq:32b) — verify with `curl -s http://localhost:11434/api/tags`
- Bash guardrail blocks inline python with backslash regexes — write scratch scripts to `.tmp/` instead
- Don Quijote original (1605) is archaic 17th-century Spanish — hard even for natives; not a learner's first book
- Platero y yo (Jiménez, 1914): PD in US, but EU copyright until 2029 — avoid for public sites
- Lorca: legally PD (died 1936) but estate is litigious — takedown risk
- Modern Quijote adaptations (Trapiello 2004, Anaya/Edelsa, Navarro Durán) are all copyrighted
- PD adapted Quijote exists: Oca y Merino 1916 "acomodado para las escuelas primarias" — Wikisource scan, needs OCR
- Free legal modern content: UNAM CEPE graded readers (B1–B2 PDFs), CVC "Lecturas paso a paso", Vikidia (children's encyclopedia, free license)
- Blasco Ibáñez (died 1928) = PD + modern-feeling prose; Pío Baroja PD in EU from Jan 2027

## Dependencies

- None installed yet — project not scaffolded. Plan targets: **Astro 7 (latest, verified 7.3.1)** (minimal template, strict TS default), React via `--add react`, Tailwind 4 via `astro add tailwind` (@tailwindcss/vite), vitest (dev, tokenizer tests). Scripts in plain `.mjs` (no tsx).
