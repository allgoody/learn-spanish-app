# Context — learn-spanish-app

**Project:** Spanish learning web app (static, mobile-first)
**Rules:** See `.pi/project-rules-memory.md` for tech stack, architecture, and design constraints.
**Routing decision:** See `idea/routing.md` — flat URLs, content language as data, translation language tied to app setting. Read before touching URL structure.

Last updated: 2026-09-27

## Current Task

**Site content/legal additions complete (2026-09-27).** Google Analytics + cookie consent, About/Privacy pages, non-blocking desktop word popup, JSON-LD on every page. Verified: astro check 0 errors, 92 tests green, build 55 pages. Nothing deployed.

## Completed This Session

- [x] **Google Analytics (G-RZLGCDEZSN) + cookie consent banner** — `CookieConsent.astro` rendered from Layout; GA consent-gated (loads only after "Принять"; canonical `gtag()` arguments form, no Partytown), localStorage `cookie-consent`; banner strings in i18n (ru/en)
- [x] **About (`/about/`) + Privacy (`/privacy/`)** — Russian content; SEO title/description in `lib/seo.ts`; footer nav links; privacy has a consent-reset button
- [x] **Desktop word popup non-blocking** — `pointer-events-none` on the desktop tooltip (`Reader.tsx`) so clicks pass through to words beneath; flips below the word when there is no room above. Tests in `Reader.test.tsx`
- [x] **JSON-LD on all pages** — Book, Chapter, LearningResource, AboutPage, WebPage + BreadcrumbList everywhere (home already had WebSite + Organization). Helper `lib/jsonld.ts`; all 55 built pages parse, 0 failures
- [x] **`llms.txt`** filled in (was a TODO placeholder)

## In Progress

- (none)

## Blocked / Needs Decision

- [?] (carried) **Widen `collect.url` in `astro/lighthouserc.json`?** — audit surface is `/` only; user decision pending

## Next Steps

1. (user-driven) Next book from `idea/findings.md` — pipeline covers Gutenberg (`fetch-book.mjs`) AND Wikisource (`fetch-wikisource.mjs`)
2. (carried) Commit pending changes — this session's files + the 2026-09-05 set are still UNCOMMITTED
3. (carried, user decision) Widen `collect.url` to `/books/andanzas/`, `/words/pronouns/`, a chapter — then re-run `node astro/scripts/perf-check.mjs --full --runs 3 astro`
4. (carried) Re-run audit-perf / audit-lighthouse-loop — not run since GA/JSON-LD/About/Privacy landed

## Key Decisions

- **GA is consent-gated** — no analytics script (and no cookie) until the user clicks "Принять". Keeps the site GDPR-clean and the GA script out of the Lighthouse window; no consent-mode pre-consent pings
- **JSON-LD per page type** — `Chapter` is a real schema.org type; `PrivacyPolicy` is NOT (privacy page uses `WebPage`). Breadcrumbs via `lib/jsonld.ts`
- (carried) Audit surface = home page only; SEO per-locale data; English removed (kept as data); multi-language = subdirectory + hreflang (locked); domain niceio.com; gloss model user-supplied `deepseek-v4-flash:0731-cloud`; v1 = reading + glosses only
- (carried) Book #2 (selva) details live in `project-rules-memory.md` — prior-session work, not repeated here

## File Map

- `astro/src/components/CookieConsent.astro` — banner + consent-gated GA loader (new)
- `astro/src/pages/about.astro`, `astro/src/pages/privacy.astro` — RU pages (new)
- `astro/src/lib/jsonld.ts` + `astro/test/lib/jsonld.test.ts` — `breadcrumbs()` helper (new)
- `astro/src/lib/i18n.ts` — `about`/`privacy`/`footerNav`/`cookie*` strings (ru+en)
- `astro/src/lib/seo.ts` — about/privacy title+description (ru+en)
- `astro/src/layouts/Layout.astro` — footer nav + `<CookieConsent />`
- `astro/src/components/Reader.tsx` — non-blocking tooltip + above/below placement
- `astro/test/components/Reader.test.tsx` — class + near-top placement tests
- `astro/src/pages/books/[book]/index.astro`, `astro/src/pages/books/[book]/[slug].astro`, `astro/src/pages/words/[category]/index.astro` — JSON-LD added
- `astro/public/llms.txt` — real site summary
- `.tmp/ld-check.mjs` — JSON-LD dist parser (scratch, session)

## Gotchas / Warnings

- **JSON-LD check**: parse every `ld+json` block in `dist/` with `.tmp/ld-check.mjs` (no `ld` CLI needed); expected types — home WebSite+Organization, book landing Book, reader Chapter, words LearningResource, about AboutPage, privacy WebPage
- **`pointer-events-none` trade-off**: desktop tooltip text is no longer selectable/copyable (intentional for non-blocking)
- (carried) Vitest + vite rewriting `new URL("<literal>", import.meta.url)` in tests; `gloss.mjs --data-dir` is CWD-relative; Wikisource parse structure (ws-data in header, style block in first `<p>`) — full detail in `project-rules-memory.md` Lessons
- (carried) Audit surface = `/` only; LH 13.4.1 blind-spots; INP n/a; LCP = H1 text; 5 islands `client:load`; Windows chrome-launcher EPERM crash expected; JSX `className` vs Astro `class`; sticky footer `min-h-dvh`
