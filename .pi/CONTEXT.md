# Context — learn-spanish-app

**Project:** Spanish learning web app (static, mobile-first)
**Rules:** See `.pi/project-rules-memory.md` for tech stack, architecture, and design constraints.

Last updated: 2026-09-05

## Current Task

**App plan COMPLETE** (42 pages, reader with gloss popups, deployed). This session: created the standalone `template/` (full stylesheet + kitchen-sink + style guide, dark theme, ADA-compliant). Template work is DONE and uncommitted. App polish stage (user-driven) remains.

## Completed This Session

- [x] **`template/` created** (new, uncommitted): `style.css` (full taxonomy: 81 HTML elements, 14 UI components, 7 states, 5 token categories as CSS custom properties; stone/amber design language from the astro site; dark theme via `[data-theme]` attr + `prefers-color-scheme` with `:root:not([data-theme="light"])`), `kitchen-sink.html` (preview with theme toggle + CTDev footer), `STYLE-GUIDE.md` (filled reference). Audit helper: 95/95 styled, 0 partial, 0 missing
- [x] **Modal open-on-load fixed**: `.modal` now `display:none` by default, `.modal.open` shows it; kitchen-sink wires open/close buttons, overlay click, Esc; native `<dialog>` demo also wired via showModal()
- [x] **ADA/WCAG audit (axe-core 4.10.2, light + dark)**: all violations fixed — contrast (semantic colors → 700-level in light, new `--color-on-accent` token = white light / #0c0a09 dark for colored buttons + pagination current; audit-banner → theme tokens), landmarks (page-level `<main>`, demo `<aside>` moved top-level, navs got aria-labels, no nested mains), heading order (demo h1/h2 removed), `aria-disabled` on disabled link, `tabindex="0"` on tooltip, modal `role="dialog" aria-modal aria-labelledby` + focus management (focus in on open, return on close), video/audio/canvas fallback text
- [x] Verified in browser: both themes render, modal focus flow, landmarks, 95/95 coverage

## In Progress

- (none — template task complete)

## Blocked / Needs Decision

- [ ] **Known ADA exception**: CTDev footer credit (0.65rem, muted, 0.6 opacity — user-mandated style) fails contrast at 2.26:1. Documented, kept as-is
- [ ] Manual browser checks (WP-10 checklist): hover tooltip + pin + Esc, tap bottom sheet, keyboard Enter/Space, RU/EN toggle — user to verify
- [ ] **DEPLOYED (user-approved):** Cloudflare Pages `learn-words` → <https://learn-words-5mq.pages.dev/>. Re-deploy: `wrangler pages deploy astro/dist --project-name learn-words`

## Next Steps

1. Commit `template/` (3 files, all new)
2. **Dark theme for the app** (user-requested todo — the template's token approach can inform it)
3. **Check translations for errors** — user spotted English words written in Cyrillic (audit glosses.json `ru` fields for transliterated English, e.g. "винтаж" vs "старинный")
4. Post-build polish (user-driven): `/skill:audit-add-test`, `/skill:audit-lighthouse-loop`, `/skill:audit-perf`

## Key Decisions

- **Template design language = astro site's**: stone neutrals + amber accent (amber-700 #b45309, stone-200 borders, white bg, system-ui, rounded 4px)
- **Dark theme mechanism**: CSS custom properties; `[data-theme="dark"]` forces dark, `[data-theme="light"]` forces light, otherwise `prefers-color-scheme` wins
- **Contrast strategy**: light mode uses 700-level semantic colors (white text passes 4.5:1); dark mode uses 400-level colors with dark text (`--color-on-accent: #0c0a09`)
- **Gloss model: USER-SUPPLIED, never defaulted** — `deepseek-v4-flash:0731-cloud`
- **v1 scope: reading + glosses only** — known-words, TTS, SRS later

## File Map

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
- **`import.meta.glob` must live INSIDE `getStaticPaths()`** in Astro pages (isolated scope)
- **`api/tags` doesn't list `deepseek-v4-flash:0731-cloud`** but chat endpoint accepts it (cloud-proxied)
- **Subagent status display misleading** — don't kill a subagent that looks idle while blocked in a long bash call
- **Guardrail**: `taskkill //PID` mangled → `powershell -Command "Stop-Process -Id N -Force"`; run node scripts from repo root with `.tmp/` paths
