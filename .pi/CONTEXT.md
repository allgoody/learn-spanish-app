# Context — learn-spanish-app

**Project:** Spanish learning web app (static, mobile-first)
**Rules:** See `.pi/project-rules-memory.md` for tech stack, architecture, and design constraints.
**Routing decision:** See `idea/routing.md` — flat URLs, content language as data, translation language tied to app setting. Read before touching URL structure.

Last updated: 2026-09-05

## Current Task

**All tasks completed.** Session covered: per-locale SEO titles/descriptions (ru), English removed from the app, og:image swap, sitemap + robots.txt, domain change to **<https://niceio.com/>** (deployed, DNS verified 200), footer fixes (CTDev url → /ru/, sticky footer). 4 commits made; 5 files uncommitted (see File Map). Deploy command: `wrangler pages deploy astro/dist --project-name learn-words` (project `learn-words`, custom domain niceio.com).

## Completed This Session

- [x] **Domain → niceio.com** — `astro.config.mjs` `site:`, JSON-LD urls (index.astro), robots.txt Sitemap line. Deployed twice; niceio.com verified live (200, DNS points to Cloudflare Pages)
- [x] **Footer fixes** — CTDev credit href → `https://ctdev.dev/ru/`; sticky footer: body `min-h-dvh flex flex-col`, content wrapped in `<div class="flex-1">` so footer anchors to viewport bottom on short pages
- [x] **og:image swapped** — user's design → `public/og.jpg` (1376×768, ffmpeg q4, 42KB); `og.png` deleted
- [x] **Sitemap on every build** — `@astrojs/sitemap` + `site:` config; emits `sitemap-index.xml` + `sitemap-0.xml` (44 URLs)
- [x] **robots.txt** — Allow all + `Sitemap: https://niceio.com/sitemap-index.xml`
- [x] **Per-locale SEO data** — `lib/seo.ts` (`seo: Record<Lang, SeoStrings>`, `seoLang = "ru"`); all 4 page templates call `seo[seoLang]`; Layout defaults from seo too
- [x] **Russian titles/descriptions live** — index «Учить испанский язык — книги с переводом и словарём | Aprende español»; book «{title} — читать на испанском с переводом»; chapters «{chapter} — {book} с переводом» + unique RU description; words «Испанские слова по теме „{title}"…»
- [x] **`lang`/JSON-LD fixed** — index + book landing `contentLang="ru"`, `inLanguage: 'ru'`; chapters keep `lang="es"`
- [x] **English removed from the app** — `LANGS = ["ru"]` (group hidden < 2), `getLang()` → "ru" (stale "en" ignored), no-FOUC applies only "ru"; `en` strings KEPT in i18n.ts + seo.ts as future data; tests updated (51/51 pass)
- [x] (previous session) **Pronouns lesson enriched** — IPA + usage examples, 69 entries
- [x] (previous session) **URL restructure executed** — chooser at `/`, generic book/chapter/words routes, `lang` fields, `<html lang>` fix

## In Progress

- (none)

## Blocked / Needs Decision

- (none — deployed to niceio.com)

## Next Steps

1. **Commit the 5 uncommitted files** (domain change + footer fixes + this context) — user-driven via /skill:commit
2. (when a 2nd UI language lands) **sitemap hreflang annotations** — `@astrojs/sitemap` installed; add `i18n` config + hreflang links then
3. (future, routing.md §7) **Glosses per-language map** — `glosses.json` schema `ru` → `{ru, en}`, bilingual pipeline re-run (11.7k forms × 2 langs), reader fallback ru → lemma. User-driven

## Key Decisions

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

- `astro/astro.config.mjs` — `site: https://niceio.com/` + `@astrojs/sitemap` (UNCOMMITTED)
- `astro/src/pages/index.astro` — JSON-LD urls → niceio.com (UNCOMMITTED)
- `astro/public/robots.txt` — Sitemap → niceio.com (UNCOMMITTED)
- `astro/src/layouts/Layout.astro` — footer: CTDev href /ru/ + sticky footer (`min-h-dvh flex flex-col` body, `<div class="flex-1">` wrapper) (UNCOMMITTED)
- `astro/public/og.jpg` — og:image (ffmpeg-optimized 1376×768, 42KB)
- `astro/src/lib/seo.ts` — per-locale SEO map (ru + en), `seoLang = "ru"`
- `astro/src/components/HeaderMenu.tsx` — `LANGS = ["ru"]`, language group hidden < 2 langs
- `astro/src/lib/i18n.ts` — `getLang()` → "ru"; `en` strings kept for future
- `astro/test/components/HeaderMenu.test.tsx` + `astro/test/lib/i18n.test.ts` — locked-behavior tests
- `astro/src/data/words/pronouns.json` — 69 entries, 9 groups, `ipa` + `example {es, ru}`
- `astro/src/lib/types.ts` — `WordEntry.ipa?`, `WordEntry.example?`
- `astro/src/components/WordLesson.tsx` — renders IPA + example
- `astro/src/components/Chooser.tsx` + `BookLanding.tsx` + `Reader.tsx`, `astro/src/lib/words.ts` + `theme.ts`, `astro/src/styles/global.css` — restructure + dark theme files
- `astro/scripts/gloss.mjs` + `astro/scripts/lib/gloss-parse.mjs` + `astro/test/gloss-parse.test.mjs` — gloss pipeline
- `astro/src/data/books/andanzas/glosses.json` — incremental gloss library
- `.tmp/gloss.log`, `.tmp/pg78052.txt`, `.tmp/gloss-audit-report.md` — pipeline artifacts (keep)

## Gotchas / Warnings

- **IPA symbols (ʝ, ɣ, ð, ŋ, ɾ, tʃ) trigger typos-checker "unknown word" advisories** on pronouns.json — expected, no action
- **Plan WP order is load-bearing**: Layout `contentLang`/`description` props MUST precede pages passing them — `astro check` fails otherwise (ts(2322); verified empirically)
- **Pronouns content = 69 entries** (not 55)
- **JSX convention**: islands use `className` (see BookLanding.tsx); Astro templates use `class`
- **Sticky footer uses `min-h-dvh`** — `min-h-screen` (100vh) cuts the footer on mobile when the address bar collapses
