# Context — learn-spanish-app

**Project:** Spanish learning web app (static, mobile-first)
**Rules:** See `.pi/project-rules-memory.md` for tech stack, architecture, and design constraints.
**Routing decision:** See `idea/routing.md` — flat URLs, content language as data, translation language tied to app setting. Read before touching URL structure.

Last updated: 2026-09-05

## Current Task

**SEO titles/descriptions per-locale + English removed from the app — DONE.** All pages now emit unique Russian `<title>`/`<meta description>` from `lib/seo.ts` (per-locale map, `seoLang = "ru"`); index + book landing now `lang="ru"` + JSON-LD `inLanguage: 'ru'`; English removed from the App language toggle (`LANGS = ["ru"]`, group hidden, `getLang()` returns "ru", stale localStorage "en" ignored). Verified: astro check 0 errors, 51/51 tests, build 44 pages — grep-verified titles/descriptions/lang on index, book landing, chapter, words pages. Deployment still pending user go-ahead.

Previous: **Pronouns lesson enriched (IPA + examples) — DONE.** All 69 entries in `/words/pronouns/` now carry IPA (`ipa`, broad seseo/neutral, slashes stored in data) and a short usage example with RU translation (`example: {es, ru}`). `WordEntry` type extended; `WordLesson.tsx` renders both. Verified: 69/69 entries have both fields, WordLesson tests 2/2, astro check 0 errors.

## Completed This Session

- [x] **og:image swapped to the new design** — `.tmp/Aprende espanol og image.jpeg` (2752×1536) → `public/og.jpg` (1376×768, ffmpeg q4, 42KB); old `og.png` deleted; Layout meta now `/og.jpg`
- [x] **Sitemap on every build** — `@astrojs/sitemap` installed, `site: https://learn-words-5mq.pages.dev/` in astro.config; build emits `sitemap-index.xml` + `sitemap-0.xml` (44 URLs, verified)
- [x] **robots.txt** — `public/robots.txt` now references the sitemap (`Sitemap: https://learn-words-5mq.pages.dev/sitemap-index.xml`)
- [x] **Per-locale SEO data** — new `astro/src/lib/seo.ts`: `seo: Record<Lang, SeoStrings>` (ru + en entries), `seoLang` constant = "ru". All 4 page templates call `seo[seoLang]` — adding a language = add map entries + URL routing, NO page template changes. Layout defaults now come from `seo[seoLang]` too
- [x] **Russian titles/descriptions live** — index: «Учить испанский язык — книги с переводом и словарём | Aprende español»; book landing: «{title} — читать на испанском с переводом»; chapters: «{chapter} — {book} с переводом» + unique RU description each; words: «Испанские слова по теме „{title}"…». Verified in built HTML
- [x] **`lang`/JSON-LD fixed for SEO** — index + book landing now `contentLang="ru"` (was `es`), JSON-LD `inLanguage: 'ru'` (was 'es'); chapter pages keep `lang="es"` (content is Spanish)
- [x] **English removed from the app** — HeaderMenu `LANGS = ["ru"]` (group hidden while < 2 langs), `getLang()` returns "ru" (stale localStorage "en" ignored), Layout no-FOUC script applies only "ru". `en` strings KEPT in `lib/i18n.ts` + `lib/seo.ts` as future data. Tests updated: HeaderMenu 6/6 (lang-group-hidden test replaces the English-switch test), i18n 13/13 (stale-en-ignored test)
- [x] (previous session) **Pronouns lesson enriched** — IPA + usage examples for all 69 entries
- [x] (previous session) **URL restructure executed** (plan restructure-routing, 11 WPs / 3 phases) — chooser at `/`, generic `/books/[book]/` + `/books/[book]/[slug]` reader, `/words/pronouns/` lesson, `lang` fields, `<html lang>` fix; verified: astro check 0 errors, build 44 pages, 51 tests, 5 routes probe 200

## In Progress

- (none)

## Blocked / Needs Decision

- [?] **Deploy to Cloudflare Pages?** Live site: <https://learn-words-5mq.pages.dev/> (project `learn-words`). Restructure + lesson enrichment NOT deployed. Re-deploy: `wrangler pages deploy astro/dist --project-name learn-words`. Do NOT deploy without explicit ask.

## Next Steps

1. (when a 2nd UI language lands) **sitemap hreflang annotations** — `@astrojs/sitemap` already installed; add `i18n` config then. robots.txt already references the sitemap
2. (future, routing.md §7) **Glosses per-language map** — `glosses.json` schema `ru` → `{ru, en}`, bilingual pipeline re-run (11.7k forms × 2 langs), reader fallback ru → lemma. User-driven, NOT in the plan

## Key Decisions

- **SEO titles/descriptions are per-locale data** — `lib/seo.ts` (`seo: Record<Lang, SeoStrings>`, `seoLang` constant). Pages call `seo[seoLang]`; adding a language = add map entries + URL routing, NO page template changes. Layout defaults also come from seo
- **English removed from the app (2026-09-05)** — toggle `LANGS = ["ru"]` (group hidden < 2), `getLang()` returns "ru" (stale "en" ignored), no-FOUC script applies only "ru". `en` strings kept in i18n.ts + seo.ts as future data — NOT dead code
- **Multi-language future model LOCKED (2026-09-05)** — subdirectory per language + hreflang when a 2nd UI language lands. Supersedes routing.md §7's old "UI language in URL? No" (that predates SEO as a goal). See "Multi-language" section below
- **IPA convention**: broad, seseo/neutral (matches lesson's LatAm coverage — voseo, ustedes); slashes stored IN data, rendered as-is (reader glosses same). Castilian `/θ/` swap = data-only change
- **Example convention**: one per entry, most common form for multi-form entries (mi/mis → "Mis amigos…"), learner-level Spanish, RU translation always included
- **Routing model (idea/routing.md is source of truth)**: flat URLs — content language is data (`lang` field), never in URLs; translation language = app setting (UI lang); word lesson ids are per-language slugs; chapter URLs `/books/andanzas/{slug}` are permanent — no `_redirects`; source language is NOT a persistent setting
- **`<html lang>` invariant**: content pages keep content lang even after a UI switch — no-FOUC script AND `setLang` both skip the override when `data-content-lang` is present
- **Glosses stay RU-only for now** — per-language gloss map is a data task, out of scope
- **Gloss model: USER-SUPPLIED, never defaulted** — `deepseek-v4-flash:0731-cloud`
- **v1 scope: reading + glosses only** — known-words, TTS, SRS later

## Multi-language (locked decisions — future implementation)

> Trace for when a 2nd UI language (English) is re-enabled. The app is Russian-only today.

- **URL model: subdirectory per language + hreflang** — `/` = Russian (default, keep as-is), `/en/` = English, future `/de/` etc. NOT query params (Google indexes one version only), NOT subdomains (splits domain authority), NOT JS-only swapping (invisible to crawlers — the old localStorage toggle was exactly this). This supersedes routing.md §7's "UI language in URL? No"
- **hreflang**: `<link rel="alternate" hreflang="ru|en|x-default">` generated in Layout from the current URL by swapping the prefix. Blesses the near-duplicate chapter pages (Spanish text shared, chrome/glossary differ)
- **Per-language vs shared**: UI strings + glossary translations + titles/descriptions + `lang` attr + JSON-LD `inLanguage` + `og:locale` are per-language; Spanish book text + chapter structure are shared. Chapter pages keep `lang="es"` even in the English version (content is Spanish; hreflang distinguishes versions)
- **Implementation sketch**: move pages under `src/pages/[lang]/...` (Astro `i18n` config, `defaultLocale: 'ru'`), drive the header toggle by URL instead of localStorage, `seoLang` becomes a function of the URL prefix — every page template keeps working unchanged
- **Also needed then**: sitemap hreflang annotations — `@astrojs/sitemap` is already installed (build emits `sitemap-index.xml` + `sitemap-0.xml`, 44 URLs) and `robots.txt` already references it; only the `i18n` config + hreflang links are missing
- **Gloss language follows UI language** (routing.md §2) — per-language gloss map `{ru, en}` is a separate data task (routing.md §7)

## File Map

- `astro/public/og.jpg` — og:image (from user's design, ffmpeg-optimized 1376×768, 42KB); `og.png` deleted
- `astro/astro.config.mjs` — `site` + `@astrojs/sitemap` integration (sitemap on every build)
- `astro/public/robots.txt` — Allow all + Sitemap reference
- `astro/src/lib/seo.ts` — NEW: per-locale SEO map (`seo: Record<Lang, SeoStrings>`, `seoLang = "ru"`); ru + en entries; home/book/chapter/category title+description functions
- `astro/src/pages/index.astro` — seo titles/descriptions, `contentLang="ru"`, JSON-LD `inLanguage: 'ru'`
- `astro/src/pages/books/[book]/index.astro` — seo bookTitle/bookDescription, `contentLang="ru"`
- `astro/src/pages/books/[book]/[slug].astro` — seo chapterTitle/chapterDescription, `contentLang={book.lang}` (es)
- `astro/src/pages/words/[category]/index.astro` — seo categoryTitle/categoryDescription
- `astro/src/layouts/Layout.astro` — defaults from `seo[seoLang]`; no-FOUC script applies only "ru"
- `astro/src/components/HeaderMenu.tsx` — `LANGS = ["ru"]`, language group hidden while < 2 langs
- `astro/src/lib/i18n.ts` — `getLang()` returns "ru" (stale "en" ignored); `en` strings kept for future
- `astro/test/components/HeaderMenu.test.tsx` + `astro/test/lib/i18n.test.ts` — updated to locked behavior
- `astro/src/data/words/pronouns.json` — 69 entries, 9 groups; each now has `ipa` + `example {es, ru}` (schema: es, ipa, pos, ru, example, grammar, note)
- `astro/src/lib/types.ts` — `WordEntry` gained `ipa?: string | null` and `example?: { es: string; ru: string } | null`
- `astro/src/components/WordLesson.tsx` — renders IPA (mono, muted, next to word) + example (italic es — ru, under translation)
- `astro/test/components/WordLesson.test.tsx` — asserts IPA + example rendering
- (previous session) `astro/src/components/Chooser.tsx` + `BookLanding.tsx` + `WordLesson.tsx`, `astro/src/lib/words.ts`, `astro/src/pages/books/[book]/index.astro` + `[slug].astro`, `astro/src/pages/words/[category]/index.astro`, `astro/test/components/Chooser.test.tsx` + `BookLanding.test.tsx` — restructure files
- `astro/src/components/HeaderMenu.tsx`, `astro/src/lib/theme.ts`, `astro/src/styles/global.css` — hamburger menu + dark theme (UNCOMMITTED)
- `astro/scripts/gloss.mjs` + `astro/scripts/lib/gloss-parse.mjs` + `astro/test/gloss-parse.test.mjs` — gloss pipeline (uncommitted)
- `astro/src/data/books/andanzas/glosses.json` — incremental gloss library (uncommitted)
- `.tmp/gloss.log`, `.tmp/pg78052.txt`, `.tmp/gloss-audit-report.md` — pipeline artifacts (keep)

## Gotchas / Warnings

- **IPA symbols (ʝ, ɣ, ð, ŋ, ɾ, tʃ) trigger typos-checker "unknown word" advisories** on pronouns.json — expected, no action
- **Plan WP order is load-bearing**: Layout `contentLang`/`description` props MUST precede pages passing them — `astro check` fails otherwise (ts(2322); verified empirically)
- **Pronouns content = 69 entries** (not 55)
- **JSX convention**: islands use `className` (see BookLanding.tsx); Astro templates use `class`
