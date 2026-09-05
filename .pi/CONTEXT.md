# Context — learn-spanish-app

**Project:** Spanish learning web app (static, mobile-first)
**Rules:** See `.pi/project-rules-memory.md` for tech stack, architecture, and design constraints.
**Routing decision:** See `idea/routing.md` — flat URLs, content language as data, translation language tied to app setting. Read before touching URL structure.

Last updated: 2026-09-05

## Current Task

**All tasks completed.** Session covered: full audit pass (all 3 audit skills via subagents on `deepseek-v4-flash:0731-cloud:max`) — site is GREEN across every gate. 27 new tests added (78 total). Nothing in progress; next action is user-driven (commit + optional config widening).

## Completed This Session

- [x] **audit-lighthouse-loop** (`--fix auto`, Gate target) — iteration 1 clean: zero gate failures both presets. Desktop perf 0.99 / mobile 1.0, LCP 751 ms / 1.39 s, CLS 0.000. 0 fixes, 0 deferred. Ledger: no new findings (1 closed entry: footer contrast)
- [x] **audit-add-test** — 27 new tests, 78/78 passing (51 existing + 27 new), tsc 0 errors, astro check 0 errors. New: `test/lib/seo.test.ts` (8), `test/layouts/Layout.test.ts` (10, AstroContainer), `test/data/words/pronouns.test.ts` (4), `WordLesson.test.tsx` 2→7. Infra: `vitest.config.ts` → `getViteConfig` + `react()`, `setup.ts` matchMedia polyfill, `types.d.ts` astro module decl. `src/` untouched
- [x] **audit-perf** (median-of-3 confirm) — PASS: LCP 829 ms desktop / 1.48 s mobile, CLS 0.000, perf 99/100, a11y/BP/SEO/agentic all 1.0. Bundle JS 64.2 KB gz / 120 KB, CSS 3.9 KB / 50 KB. No client: or image violations (LCP = H1 text, zero `<img>` in src/). JSON-LD/llms.txt/links/meta/imageBudget all green
- [x] (previous session) **Domain → niceio.com**, footer fixes, og:image, sitemap + robots.txt, per-locale SEO (ru), English removed from app, URL restructure

## In Progress

- (none)

## Blocked / Needs Decision

- [?] **Widen `collect.url` in `astro/lighthouserc.json`?** Currently `["/"]` — Lighthouse + dist checks (links/meta/imageBudget/jsonld) cover ONLY the home page; the other 43 pages (book landing, 41 chapters, words) are outside the audit surface. User decision pending (perf subagent flagged it; nothing changed)

## Next Steps

1. **Commit the uncommitted files** (5 pre-existing + 7 new test files + vitest.config.ts) — user-driven via /skill:commit
2. (optional, user decision) **Widen `collect.url`** to `/books/andanzas/`, `/words/pronouns/`, a chapter — then re-run `node astro/scripts/perf-check.mjs --full --runs 3 astro`
3. (when a 2nd UI language lands) **sitemap hreflang annotations** — `@astrojs/sitemap` installed; add `i18n` config + hreflang links then
4. (future, routing.md §7) **Glosses per-language map** — `glosses.json` schema `ru` → `{ru, en}`, bilingual pipeline re-run (11.7k forms × 2 langs), reader fallback ru → lemma. User-driven

## Key Decisions

- **Audit surface = home page only (2026-09-05)** — `collect.url: ["/"]` in lighthouserc.json; widening is a config decision, not a code change
- **SEO titles/descriptions are per-locale data** — `lib/seo.ts`; adding a language = map entries + URL routing, NO page template changes
- **English removed from the app (2026-09-05)** — `en` strings kept as future data, NOT dead code
- **Multi-language future model LOCKED (2026-09-05)** — subdirectory per language + hreflang; supersedes routing.md §7's old "UI language in URL? No". Full trace in "Multi-language" section below
- **Site domain: niceio.com** (2026-09-05) — replaces learn-words-5mq.pages.dev everywhere (site config, JSON-LD, robots)
- **IPA convention**: broad, seseo/neutral; slashes stored IN data, rendered as-is. Castilian `/θ/` swap = data-only change
- **Example convention**: one per entry, most common form, learner-level Spanish, RU translation always included
- **Routing model (idea/routing.md is source of truth)**: flat URLs — content language is data, never in URLs; translation language = app setting; chapter URLs `/books/andanzas/{slug}` permanent; source language NOT a persistent setting
- **`<html lang>` invariant**: content pages keep content lang after UI switch — no-FOUC script AND `setLang` skip override when `data-content-lang` present
- **Glosses stay RU-only** — per-language gloss map is a data task (routing.md §7)
- **Gloss model: USER-SUPPLIED, never defaulted** — `deepseek-v4-flash:0731-cloud`
- **v1 scope: reading + glosses only** — known-words, TTS, SRS later

## Multi-language (locked decisions — future implementation)

> Trace for when a 2nd UI language (English) is re-enabled. The app is Russian-only today.

- **URL model: subdirectory per language + hreflang** — `/` = Russian (default), `/en/` = English, future `/de/` etc. NOT query params, NOT subdomains, NOT JS-only swapping (invisible to crawlers — the old localStorage toggle was exactly this)
- **hreflang**: `<link rel="alternate" hreflang="ru|en|x-default">` generated in Layout by swapping the URL prefix. Blesses near-duplicate chapter pages (Spanish text shared, chrome/glossary differ)
- **Per-language vs shared**: UI strings + gloss translations + titles/descriptions + `lang` attr + JSON-LD `inLanguage` + `og:locale` per-language; Spanish book text + chapter structure shared. Chapters keep `lang="es"` even in the English version
- **Implementation sketch**: pages under `src/pages/[lang]/...` (Astro `i18n` config, `defaultLocale: 'ru'`), header toggle driven by URL instead of localStorage, `seoLang` becomes a function of the URL prefix — page templates unchanged
- **Gloss language follows UI language** (routing.md §2) — per-language gloss map `{ru, en}` is a separate data task

## File Map

- `astro/test/lib/seo.test.ts` — NEW: per-locale SEO map tests (8)
- `astro/test/layouts/Layout.test.ts` — NEW: Layout SSR tests via AstroContainer (10)
- `astro/test/data/words/pronouns.test.ts` — NEW: pronouns data shape (4)
- `astro/test/components/WordLesson.test.tsx` — extended 2→7 (group headings, 69 items, grammar labels)
- `astro/test/setup.ts` — matchMedia polyfill (guarded, node/jsdom dual env)
- `astro/test/types.d.ts` — global `declare module "*.astro"` (inline import() type)
- `astro/vitest.config.ts` — `getViteConfig` + `react()` (AstroContainer + React server renderer)
- `astro/lighthouserc.json` — `collect.url: ["/"]` (audit surface = home only; widening = user decision)
- `astro/astro.config.mjs` — `site: https://niceio.com/` + `@astrojs/sitemap` (UNCOMMITTED)
- `astro/src/pages/index.astro` — JSON-LD urls → niceio.com (UNCOMMITTED)
- `astro/public/robots.txt` — Sitemap → niceio.com (UNCOMMITTED)
- `astro/src/layouts/Layout.astro` — footer: CTDev href /ru/ + sticky footer (UNCOMMITTED)
- `astro/public/og.jpg` — og:image (ffmpeg-optimized 1376×768, 42KB)
- `astro/src/lib/seo.ts` — per-locale SEO map (ru + en), `seoLang = "ru"`
- `astro/src/components/HeaderMenu.tsx` — `LANGS = ["ru"]`, language group hidden < 2 langs
- `astro/src/lib/i18n.ts` — `getLang()` → "ru"; `en` strings kept for future
- `astro/src/data/words/pronouns.json` — 69 entries, 9 groups, `ipa` + `example {es, ru}`
- `astro/src/lib/types.ts` — `WordEntry.ipa?`, `WordEntry.example?`
- `astro/src/components/WordLesson.tsx` — renders IPA + example
- `astro/src/components/Chooser.tsx` + `BookLanding.tsx` + `Reader.tsx`, `astro/src/lib/words.ts` + `theme.ts`, `astro/src/styles/global.css` — restructure + dark theme files
- `astro/scripts/gloss.mjs` + `astro/scripts/lib/gloss-parse.mjs` + `astro/test/gloss-parse.test.mjs` — gloss pipeline
- `astro/src/data/books/andanzas/glosses.json` — incremental gloss library
- `.tmp/gloss.log`, `.tmp/pg78052.txt`, `.tmp/gloss-audit-report.md` — pipeline artifacts (keep)

## Gotchas / Warnings

- **Audit surface is `/` only** — lighthouserc `collect.url: ["/"]`; 43 other pages build but are never Lighthouse-audited. Widen before trusting "all green" for the whole site
- **LH 13.4.1 blind-spots (version-removed, not failures)**: `interaction-to-next-paint` → `inp-breakdown-insight`; `modern-image-formats` → `image-delivery-insight`; `uses-responsive-images` → `image-size-responsive`
- **INP n/a on static pages is expected** — assertion auto-skipped; not a failure
- **LCP element is the H1 text** ("Aprende español") — the site has ZERO `<img>` in src/; nothing to preload
- **5 islands all `client:load`** — each is the page's primary above-the-fold interaction; `client:visible/idle` would delay it. No violations
- **Windows chrome-launcher EPERM cleanup crash is expected** — results are used if the JSON output exists
- **IPA symbols (ʝ, ɣ, ð, ŋ, ɾ, tʃ) trigger typos-checker "unknown word" advisories** on pronouns.json — expected, no action
- **Plan WP order is load-bearing**: Layout `contentLang`/`description` props MUST precede pages passing them — `astro check` fails otherwise (ts(2322); verified empirically)
- **Pronouns content = 69 entries** (not 55)
- **JSX convention**: islands use `className` (see BookLanding.tsx); Astro templates use `class`
- **Sticky footer uses `min-h-dvh`** — `min-h-screen` (100vh) cuts the footer on mobile when the address bar collapses
