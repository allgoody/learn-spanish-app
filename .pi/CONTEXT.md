# Context — learn-spanish-app

**Project:** Spanish learning web app (static, mobile-first)
**Rules:** See `.pi/project-rules-memory.md` for tech stack, architecture, and design constraints.
**Routing decision:** See `idea/routing.md` — flat URLs, content language as data, translation language tied to app setting. Read before touching URL structure.

Last updated: 2026-09-05

## Current Task

**URL restructure PLAN READY + REVIEWED — not yet executed.** `.pi/plans/restructure-routing/` (11 WPs, 3 phases): chooser at `/`, generic `/books/[book]/` landing, generic reader (chapter URLs unchanged), `/words/[category]/` with pronouns lesson (69 entries, 9 groups), `lang` fields, Layout `contentLang`/`description` props + `setLang` guard, 3 component tests. Second-opinion review done, all 5 findings fixed. Awaiting user go-ahead to execute.

## Completed This Session

- [x] **Plan reviewed (second opinion, review-plan skill)** — verified every WP against the real codebase (types, i18n, Layout, reader page, meta.json 41 chapters, test setup, npm scripts); found 5 issues, all fixed:
  - **Blocking**: WP-5/6 order — WP-5's `index.astro` passed `description` to Layout before WP-6 added the prop → `astro check` fails (ts(2322), verified empirically with a probe page). Swapped: Layout props = WP-5, Chooser = WP-6; cross-refs updated (WP-7/8/9 contexts, Shared Context, CONTEXT.md gotcha)
  - **Major**: `setLang` runtime gap — it unconditionally sets `document.documentElement.lang`, clobbering content lang on UI switch. Added one-line `data-content-lang` guard to WP-5 (i18n.ts MODIFY + success check); `_index.md` global constraint amended
  - **Minor**: `contentLang={book.lang}`/`{category.lang}` instead of hardcoded `"es"` (WP-7/8/9); JsonLd success comment "1 import + 2 usages"; WP-8 back-link keeps `<div class="mt-6 text-center">` wrapper
- [x] **Routing model decided (user-driven discussion)**: flat URLs, content language as data, translation language tied to app setting — written to `idea/routing.md` (decision record, linked from this file)
- [x] **Web research** on routing for learning apps (UX StackExchange mixed-language case, Astro i18n docs, Duolingo/Babbel/LingQ practice, Google multilingual guidance) → `idea/findings.md` §8. Conclusion: flat model matches UX research + industry practice; Astro's i18n routing is for parallel locale trees, NOT our case
- [x] **Plan written + self-reviewed** (`.pi/plans/restructure-routing/`): 3 bugs caught before presenting — WP order (Layout `contentLang` must precede pages using it), item count (69 not 55), `className` convention in JSX
- [x] User confirmed pronouns lesson scope: **full set, 9 groups** (personal, object, prepositional, possessive, demonstrative, relative, interrogative, indefinite)

## In Progress

- (none — plan pending execution)

## Blocked / Needs Decision

- [ ] **Plan approval** — user reviews `.pi/plans/restructure-routing/` and says go (or requests changes)
- [x] **DEPLOYED (user-approved):** Cloudflare Pages `learn-words` → [https://learn-words-5mq.pages.dev/](https://learn-words-5mq.pages.dev/). Re-deploy: `wrangler pages deploy astro/dist --project-name learn-words`. Do NOT deploy the restructure without explicit ask

## Next Steps

1. **Execute plan `restructure-routing`** (or adjust after user review) — read `.pi/plans/restructure-routing/_index.md` first
2. **Create favicon** — `public/favicon.svg` (amber/stone) + `<link rel="icon">` in Layout head (clears favicon-404 finding)
3. ~~Redo app URL structure~~ **PLANNED** (see plan) — was Next Steps #1, now covered by the plan
4. ~~Add pronouns lesson~~ **PLANNED** (WP-2 of the plan) — was Next Steps #2
5. (future, routing.md §7) **Glosses per-language map** — `glosses.json` schema `ru` → `{ru, en}`, bilingual pipeline re-run (11.7k forms × 2 langs), reader fallback ru → lemma. User-driven, NOT in the plan

## Key Decisions

- **Routing model (idea/routing.md is source of truth)**: flat URLs — content language is data (`lang` field), never in URLs; translation language = app setting (UI lang); word lesson ids are per-language slugs (`/words/pronouns/` es, `/words/pronoms/` fr later); chapter URLs `/books/andanzas/{slug}` are permanent — no `_redirects`; source language is NOT a persistent setting (chooser sections only)
- **`<html lang>` invariant**: content pages keep content lang even after a UI switch — no-FOUC script AND `setLang` both skip the override when `data-content-lang` is present (plan WP-5)
- **Glosses stay RU-only for now** — the tie-to-setting is a data task (per-language gloss map), explicitly out of the restructure plan
- **App dark theme = template's token values** (stone+amber), runtime CSS vars + `@theme inline` mapping; `[data-theme]` attr + `prefers-color-scheme` mechanism identical to template
- **Hydration pattern**: islands init to server defaults, sync from localStorage in mount effect (avoids React #418; suppressHydrationWarning keeps stale server text — don't use)
- **Gloss model: USER-SUPPLIED, never defaulted** — `deepseek-v4-flash:0731-cloud`
- **v1 scope: reading + glosses only** — known-words, TTS, SRS later

## File Map

- `idea/routing.md` — DECISION RECORD: routing & language model (3 dimensions, URL tree, data consequences, rejected prefix alternative, open items)
- `idea/findings.md` — §8 added: routing research (UX, Astro i18n, industry practice, sources)
- `.pi/plans/restructure-routing/_index.md` + `phase-01-data-content.md` + `phase-02-pages-components.md` + `phase-03-verification.md` — the plan (11 WPs, 3 phases; REVIEWED + 5 fixes applied 2026-09-05, not executed)
- `astro/src/components/HeaderMenu.tsx`, `astro/src/lib/theme.ts`, `astro/src/styles/global.css` — previous session's hamburger menu + dark theme (still UNCOMMITTED)
- `astro/scripts/gloss.mjs` + `astro/scripts/lib/gloss-parse.mjs` + `astro/test/gloss-parse.test.mjs` — gloss pipeline (uncommitted)
- `astro/src/data/books/andanzas/glosses.json` — incremental gloss library (uncommitted)
- `.tmp/gloss.log`, `.tmp/pg78052.txt`, `.tmp/gloss-audit-report.md` — pipeline artifacts (keep)

## Gotchas / Warnings

- **Plan WP order is load-bearing**: Layout `contentLang`/`description` props (WP-5) MUST precede pages passing them (WP-6/7/8/9) — `astro check` fails otherwise (ts(2322) on unknown props; verified empirically)
- **Pronouns content = 69 entries** (not 55 — corrected in plan WP-2 success check)
- **JSX convention**: islands use `className` (see BookIntro.tsx); Astro templates use `class`
