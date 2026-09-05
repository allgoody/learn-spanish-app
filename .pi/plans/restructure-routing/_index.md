---
plan: restructure-routing
title: "Restructure App URL Structure (chooser, book landing, words lessons)"
created: 2026-09-05
status: draft
executor-model: deepseek-v4-flash:0731-cloud
planner-model: deepseek-v4-flash:0731-cloud
---

# Plan: Restructure App URL Structure

## Objective

Restructure the app's URL structure per the decision record in `idea/routing.md`:
`/` becomes a chooser with per-source-language sections (books + word categories),
book pages move under a generic `/books/[book]/` landing (chapter URLs unchanged),
and a new generic `/words/[category]/` tree hosts word lessons (first: pronouns).
Content language lives in data (`lang` field), never in URLs. Translation language
stays tied to the app setting (glosses remain Russian-only in this plan — the
per-language gloss data task is explicitly out of scope).

## Global Context

Repo root: `D:/coding/spain/learn-spanish-app`. The app lives in `astro/`
(Astro 7.3.1 + Tailwind CSS 4 + React 19 islands, TypeScript strict, mobile-first).
`template/` holds the standalone design system (style.css, kitchen-sink.html,
STYLE-GUIDE.md) — the app's `global.css` carries the same token values as runtime
CSS vars mapped to Tailwind utilities via `@theme inline`. `idea/` holds decision
records. `.pi/` holds session context. All commands in this plan run from `astro/`
(`cd astro && ...`).

Current routes:

- `/` — `src/pages/index.astro` — book landing for andanzas, hardcoded `books[0]`
  (BookIntro island + chapter list + WebSite/Organization JSON-LD)
- `/books/andanzas/[slug]` — `src/pages/books/andanzas/[slug].astro` — chapter
  reader (Reader island + static chapter text + prev/next nav + hardcoded "← Home")

Key files to read before starting:

- `astro/src/pages/index.astro` — current home page (will be rewritten)
- `astro/src/pages/books/andanzas/[slug].astro` — current reader (will be
  genericized and moved)
- `astro/src/components/BookIntro.tsx` — the island pattern (will be renamed and
  extended into BookLanding)
- `astro/src/lib/i18n.ts` — strings dict + getLang/onLangChange + chapterCount
- `astro/src/lib/books.ts` — books registry
- `astro/src/lib/types.ts` — BookMeta, Token, GlossLibrary
- `astro/src/layouts/Layout.astro` — html shell, no-FOUC script, header/footer
- `astro/src/styles/global.css` — token utilities (bg-paper, text-ink, text-muted,
  border-line, bg-surface-hover, bg-accent, bg-accent-soft, text-on-accent)
- `astro/test/components/HeaderMenu.test.tsx` — the component test pattern
- `astro/src/data/books/andanzas/meta.json` — book metadata (gains `lang`)

Design tokens (from global.css `@theme inline`): `bg-paper`, `text-ink`,
`text-muted`, `border-line`, `border-line-strong`, `bg-surface-hover`, `bg-accent`,
`bg-accent-soft`, `text-on-accent`, `bg-popup`, `text-popup-text`. Accent is amber
(amber-700 light / amber-500 dark). Radius 4px. Max content width `max-w-2xl mx-auto px-4 py-8`.

## Global Constraints

- DO: Follow the established island pattern — components init to server defaults
  (`useState<Lang>("ru")`), sync from `getLang()` in a mount `useEffect`, subscribe
  with `onLangChange` (see `BookIntro.tsx`). This avoids React error #418.
- DO: Use the token utilities listed above. No new colors, no inline hex.
- DO: Keep chapter URLs exactly as they are: `/books/andanzas/{slug}`.
- DO: Keep the WebSite + Organization JSON-LD blocks in `index.astro` unchanged.
- DO: Keep `Reader.tsx`, `HeaderMenu.tsx`, and `lib/i18n.ts` logic (pluralRu, getLang,
  onLangChange) untouched — only ADD keys to the `strings` dict and the one-line
  `setLang` guard from WP-5.
- DO NOT: Add a language prefix to any URL (decision in `idea/routing.md`).
- DO NOT: Change glosses.json schema or content — glosses stay Russian-only.
- DO NOT: Touch `template/` (style.css, kitchen-sink.html, STYLE-GUIDE.md).
- DO NOT: Install new packages. Everything needed is installed.
- DO NOT: Deploy. Deployment is user-driven and not part of this plan.
- DO NOT: Add JSON-LD to the new book landing or words pages (YAGNI).
- DO NOT: Create a `_redirects` file — no URLs change.

## Conventions

- Astro pages: `src/pages/...`; components: `src/components/*.tsx`; data:
  `src/data/...`; lib: `src/lib/*.ts`; tests: `test/components/*.test.tsx`.
- Islands are mounted with `client:load`.
- `import.meta.glob` calls must live INSIDE `getStaticPaths()` (isolated scope —
  frontmatter variables are dropped by the compiler).
- Tests: vitest + @testing-library/react + jest-dom (see
  `test/components/HeaderMenu.test.tsx`). Islands render RU by default — assert RU strings.
- Commands run from `astro/`: `cd astro && npm run build`, `cd astro && npx astro check`,
  `cd astro && npm test`.
- Scratch files go in `.tmp/` under the repo root, never system `/tmp/`.

## Phases

| # | Name | File | WPs | Depends On |
|---|------|------|-----|------------|
| 1 | Data model & content | phase-01-data-content.md | WP-1–WP-3 | — |
| 2 | Pages, components & tests | phase-02-pages-components.md | WP-4–WP-10 | Phase 1 |
| 3 | Verification | phase-03-verification.md | WP-11 | Phase 2 |

## File Map

**Phase 1:**

- `astro/src/lib/types.ts` — MODIFY — add `lang` to BookMeta; add WordEntry/WordGroup/WordCategory
- `astro/src/data/books/andanzas/meta.json` — MODIFY — add `"lang": "es"`
- `astro/src/data/words/pronouns.json` — CREATE — full pronouns lesson (9 groups)
- `astro/src/lib/words.ts` — CREATE — languages + categories registries

**Phase 2:**

- `astro/src/lib/i18n.ts` — MODIFY — add 4 keys × 2 languages + `setLang` content-lang guard (WP-5)
- `astro/src/components/Chooser.tsx` — CREATE — chooser island
- `astro/src/pages/index.astro` — MODIFY — rewrite as chooser
- `astro/src/components/BookLanding.tsx` — CREATE — renamed+extended BookIntro
- `astro/src/components/BookIntro.tsx` — DELETE — superseded by BookLanding
- `astro/src/pages/books/[book]/index.astro` — CREATE — generic book landing
- `astro/src/pages/books/[book]/[slug].astro` — CREATE — generic reader
- `astro/src/pages/books/andanzas/[slug].astro` — DELETE — duplicate route otherwise
- `astro/src/components/WordLesson.tsx` — CREATE — words lesson island
- `astro/src/pages/words/[category]/index.astro` — CREATE — generic words page
- `astro/src/layouts/Layout.astro` — MODIFY — contentLang + description props
- `astro/test/components/Chooser.test.tsx` — CREATE
- `astro/test/components/BookLanding.test.tsx` — CREATE
- `astro/test/components/WordLesson.test.tsx` — CREATE

**Phase 3:**

- `idea/routing.md` — MODIFY — check off the `<html lang>` open item
- `.pi/CONTEXT.md` — MODIFY — mark task done, update Next Steps

## Execution Instructions

This plan is designed for a cheap executor model. Execute as follows:

1. Read this `_index.md` fully — it provides global context and constraints.
2. Read `phase-01-data-content.md` and execute each work package **in order**.
3. After all WPs in a phase, run the Phase Verification commands.
4. If verification passes, proceed to the next phase.
5. If verification fails, fix the issue before moving on. Do not skip phases.
6. Each work package is self-contained — you should not need to read other phase files.

**Critical rules for the executor:**

- Do exactly what each work package says. Do not add features not in the plan.
- If a constraint says DO NOT, respect it absolutely.
- If you believe the plan has an error, note it and ask — do not improvise.
- Run the Success checks after every work package, not just at the end.
- All commands run from `astro/` unless a path says otherwise.
