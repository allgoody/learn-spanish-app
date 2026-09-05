# Context — learn-spanish-app

**Project:** Spanish learning web app (static, mobile-first)
**Rules:** See `.pi/project-rules-memory.md` for tech stack, architecture, and design constraints.
**Routing decision:** See `idea/routing.md` — flat URLs, content language as data, translation language tied to app setting. Read before touching URL structure.

Last updated: 2026-09-05

## Current Task

**Pronouns lesson enriched (IPA + examples) — DONE.** All 69 entries in `/words/pronouns/` now carry IPA (`ipa`, broad seseo/neutral, slashes stored in data) and a short usage example with RU translation (`example: {es, ru}`). `WordEntry` type extended; `WordLesson.tsx` renders both. Verified: 69/69 entries have both fields, WordLesson tests 2/2, astro check 0 errors. Deployment of the restructure + this enrichment still pending user go-ahead.

## Completed This Session

- [x] **IPA for all 69 pronoun entries** — `ipa` field in pronouns.json, `WordEntry.ipa?`, rendered `font-mono text-xs text-muted` next to the word (same convention as reader glosses: slashes in data, rendered as-is)
- [x] **Usage examples for all 69 entries** — `example: {es, ru}`, `WordEntry.example?`, rendered italic es — ru under the translation; examples are learner-level and show the tricky usage (voseo "Vos sabés…", le/lo/la, dative "Me gusta…", conmigo/contigo, full possessives)
- [x] WordLesson test extended: asserts IPA (`/ʝo/`) + example ("Yo hablo español." / "— Я говорю по-испански.")
- [x] (previous session) **URL restructure executed** (plan restructure-routing, 11 WPs / 3 phases) — chooser at `/`, generic `/books/[book]/` + `/books/[book]/[slug]` reader, `/words/pronouns/` lesson, `lang` fields, `<html lang>` fix; verified: astro check 0 errors, build 44 pages, 51 tests, 5 routes probe 200

## In Progress

- (none)

## Blocked / Needs Decision

- [?] **Deploy to Cloudflare Pages?** Live site: <https://learn-words-5mq.pages.dev/> (project `learn-words`). Restructure + lesson enrichment NOT deployed. Re-deploy: `wrangler pages deploy astro/dist --project-name learn-words`. Do NOT deploy without explicit ask.

## Next Steps

1. **Create favicon** — `public/favicon.svg` (amber/stone) + `<link rel="icon">` in Layout head (clears favicon-404 finding)
2. (future, routing.md §7) **Glosses per-language map** — `glosses.json` schema `ru` → `{ru, en}`, bilingual pipeline re-run (11.7k forms × 2 langs), reader fallback ru → lemma. User-driven, NOT in the plan

## Key Decisions

- **IPA convention**: broad, seseo/neutral (matches lesson's LatAm coverage — voseo, ustedes); slashes stored IN data, rendered as-is (reader glosses same). Castilian `/θ/` swap = data-only change
- **Example convention**: one per entry, most common form for multi-form entries (mi/mis → "Mis amigos…"), learner-level Spanish, RU translation always included
- **Routing model (idea/routing.md is source of truth)**: flat URLs — content language is data (`lang` field), never in URLs; translation language = app setting (UI lang); word lesson ids are per-language slugs; chapter URLs `/books/andanzas/{slug}` are permanent — no `_redirects`; source language is NOT a persistent setting
- **`<html lang>` invariant**: content pages keep content lang even after a UI switch — no-FOUC script AND `setLang` both skip the override when `data-content-lang` is present
- **Glosses stay RU-only for now** — per-language gloss map is a data task, out of scope
- **Gloss model: USER-SUPPLIED, never defaulted** — `deepseek-v4-flash:0731-cloud`
- **v1 scope: reading + glosses only** — known-words, TTS, SRS later

## File Map

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
