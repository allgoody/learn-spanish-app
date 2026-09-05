# Context — learn-spanish-app

**Project:** Spanish learning web app (static, mobile-first)
**Rules:** See `.pi/project-rules-memory.md` for tech stack, architecture, and design constraints.

Last updated: 2026-09-05

## Current Task

**Hamburger menu + dark theme DONE** (uncommitted). Header menu (RU/EN + Light/Dark/System) replaces the old LangToggle; full token-based dark theme from `template/style.css` values. Verified in browser (light/dark/system, menu, popup, mobile). App polish stage (user-driven) remains.

## Completed This Session

- [x] **Post-build polish (subagent lanes, all green)**: translation audit (25 CORRUPT fixed in glosses.json), 34 new vitest tests (45 total pass), Lighthouse loop (meta-description, robots.txt, JSON-LD WebSite+Organization ratcheted, canonical + og:image + og.png), audit-perf confirm: **PASS** — desktop perf 99 / mobile 100, LCP 840ms/1.51s, CLS 0.000, bundle 62.8KB/120KB, a11y 1.0, SEO 1, BP 1
- [x] **CTDev credit restyled (user-approved)**: opacity-60 removed (failed 2.26:1) — muted token alone passes 4.5:1 both themes (stone-500/white 4.72:1, stone-400/stone-950 7.88:1). Applied to Layout.astro + template/kitchen-sink.html; ledger entry closed; a11y gate now 1.0
- [x] **Menu toggle fix**: active segment was invisible — `bg-primary` utility never existed (token is `--color-accent`; `--color-primary` was never mapped in `@theme`). Now `bg-accent text-on-accent` (filled amber) vs inactive outlined — clear on/off states in both themes
- [x] **Reader: click-only popup on desktop** — hover no longer opens/closes; click a word opens (toggle on same word), click outside the text area closes, Esc closes, hovering the popup keeps it open; mobile tap → bottom sheet unchanged; `pinnedRef`/`onMouseOver` removed
- [x] **Hamburger menu** (user-requested): `HeaderMenu.tsx` replaces `LangToggle.tsx` (deleted) — hamburger button in header (all viewports), dropdown with "App language" (Русский/English) + "Color theme" (Светлая/Тёмная/Системная) segmented controls; outside-click + Esc close, focus returns to button; `aria-expanded`/`aria-pressed`/`role=group`
- [x] **Dark theme for the app**: `global.css` now carries the template's token values (stone+amber) as runtime CSS vars (`--bg`, `--text`, `--accent`, …) with `[data-theme="dark"]` + `@media (prefers-color-scheme: dark) :root:not([data-theme="light"])` overrides; mapped to Tailwind 4 utilities via `@theme inline` (`bg-paper`, `text-ink`, `border-line`, `bg-accent-soft`, `bg-popup`, …); all stone/amber classes replaced across Layout, index, [slug], Reader, BookIntro
- [x] `**lib/theme.ts**`: getTheme/setTheme/applyTheme/onThemeChange, localStorage `theme` key, `data-theme` attr on `<html>`
- [x] **No-FOUC**: inline pre-paint script in Layout head sets `data-theme` AND `lang` from localStorage before first paint
- [x] **Hydration fix**: islands init to server defaults (ru/system) and sync from localStorage in a mount effect — eliminates React error #418 (text mismatch) that the old `useState(getLang())` pattern caused (BookIntro had it pre-existing)
- [x] Browser-verified via chrome-devtools: system dark via media query, explicit light/dark toggle + persistence, menu open/close/Esc/outside-click, language switch re-renders UI, popup + bottom sheet + CEFR badge in both themes, mobile 375px no overflow, console clean

## In Progress

- (none — hamburger + dark theme complete)

## Blocked / Needs Decision

- [x] Manual browser checks (WP-10 checklist): hover tooltip + pin + Esc, tap bottom sheet, keyboard Enter/Space, RU/EN toggle — user to verify
- [x] **DEPLOYED (user-approved):** Cloudflare Pages `learn-words` → [https://learn-words-5mq.pages.dev/](https://learn-words-5mq.pages.dev/). Re-deploy: `wrangler pages deploy astro/dist --project-name learn-words`

## Next Steps

1. **Redo app URL structure** — main page (`/`) becomes a book-chooser (more books added later); book pages move under a book-scoped path (e.g. `/books/andanzas/...`)
2. **Add pronouns lesson** — lesson with pronouns and related things; definitions/descriptions INLINE (no popup); add the lesson to the main page
3. ~~Check translations for errors~~ **DONE (2026-09-05)**: 25 CORRUPT fixed in glosses.json; 1 transliteration to review (`gueiteiro` → "вольнщик, гайтер" → suggested "волынщик") + 16 borderline (субхунтив/субъюнктив — established terms, not errors); report in `.tmp/gloss-audit-report.md`
4. ~~Post-build polish~~ **DONE (2026-09-05)**: audit-add-test (45 tests pass), audit-lighthouse-loop (2 iters, all AUTO_FIXABLE applied), audit-perf confirm **PASS** — gate green (perf ≥ 0.9, a11y/seo/bp = 1.0). Toolkit now installed: `astro/lighthouserc.json` + `astro/scripts/perf-check.mjs`; `.pi/.app-dir` = `astro`; ledger `.pi/lh-ledger.md`

## Key Decisions

- **App dark theme = template's token values** (stone+amber), runtime CSS vars + `@theme inline` mapping to Tailwind utilities; `[data-theme]` attr + `prefers-color-scheme` mechanism identical to template
- **Hydration pattern**: islands init to server defaults, sync from localStorage in mount effect (avoids React #418 text mismatch; suppressHydrationWarning keeps stale server text — don't use)
- **Template design language = astro site's**: stone neutrals + amber accent (amber-700 #b45309, stone-200 borders, white bg, system-ui, rounded 4px)
- **Dark theme mechanism**: CSS custom properties; `[data-theme="dark"]` forces dark, `[data-theme="light"]` forces light, otherwise `prefers-color-scheme` wins
- **Contrast strategy**: light mode uses 700-level semantic colors (white text passes 4.5:1); dark mode uses 400-level colors with dark text (`--color-on-accent: #0c0a09`)
- **Gloss model: USER-SUPPLIED, never defaulted** — `deepseek-v4-flash:0731-cloud`
- **v1 scope: reading + glosses only** — known-words, TTS, SRS later

## File Map

- `astro/src/components/HeaderMenu.tsx` — hamburger menu (lang + theme switchers), replaces LangToggle
- `astro/src/lib/theme.ts` — theme state (light/dark/system), localStorage, data-theme attr
- `astro/src/styles/global.css` — token system (template values) + `@theme inline` mapping + glossable/focus styles
- `template/style.css` — full standalone stylesheet (tokens → elements → components → a11y), dark theme, ADA-clean
- `template/kitchen-sink.html` — preview page (theme toggle, modal/dialog demos, CTDev footer)
- `template/STYLE-GUIDE.md` — filled reference: every element/component/token, light→dark values
- `astro/scripts/gloss.mjs` + `astro/scripts/lib/gloss-parse.mjs` + `astro/test/gloss-parse.test.mjs` — gloss pipeline (uncommitted)
- `astro/src/data/books/andanzas/glosses.json` — incremental gloss library (uncommitted)
- `.tmp/gloss.log`, `.tmp/pg78052.txt` — pipeline artifacts (keep)

## Gotchas / Warnings

- **axe-core via CDN** works on `file://` pages (Lighthouse refuses file:// URLs — INVALID_URL). Inject `https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.2/axe.min.js` and run `axe.run(document, { resultTypes: ['violations','incomplete'] })`
- **CSS formatter rewrites** style.css/kitchen-sink.html (comments moved to own lines, 1-space indent) — re-read before editing, oldText from memory will drift
- **axe incomplete ≠ violation**: textarea placeholder, cross-origin iframe, demo video captions are untestable/demo artifacts
- `**import.meta.glob` must live INSIDE `getStaticPaths()`** in Astro pages (isolated scope)
- `**api/tags` doesn't list `deepseek-v4-flash:0731-cloud`** but chat endpoint accepts it (cloud-proxied)
- **Subagent status display misleading** — don't kill a subagent that looks idle while blocked in a long bash call
- **Guardrail**: `taskkill //PID` mangled → `powershell -Command "Stop-Process -Id N -Force"`; run node scripts from repo root with `.tmp/` paths
