# Phase 1: Scaffold & Foundation

## Objective

Create the Astro app skeleton in `astro/` (Astro 5 + React + Tailwind 4), the shared types, the RU/EN i18n module, and the base layout with footer. The site builds and serves a placeholder home page. No book data yet.

## Prerequisites

- Node v24+ and npm 11+ installed (verified: v24.14.1 / 11.11.0)
- Repo root has `.tmp/pg78052.txt` (already downloaded)
- Network access for npm installs

## Shared Context

See Global Context in `_index.md`. All commands run from repo root with `cd astro && ...` prefix. The scaffold must NOT create a nested git repo (`--no-git`).

## Work Packages

### WP-1: Scaffold Astro app with React and Tailwind

**Context:**
Repo root is empty except `.git`, `.pi/`, `idea/`, `.tmp/`. Astro 5's create-astro has no `--typescript` flag (strict is the default). Tailwind 4 is added via `astro add tailwind` (requires Astro >= 5.2.0; installs the `@tailwindcss/vite` plugin and creates `src/styles/global.css` with `@import "tailwindcss";`). React is added via `--add react` at scaffold time.

**Task:**
Create the Astro app in `astro/` with the minimal template, React integration, and Tailwind 4. Verify dev, build, and type-check all work.

**Files:**

- `astro/` — CREATE — scaffolded app

**Constraints:**

- DO: run exactly: `npm create astro@latest astro -- --template minimal --no-git --install --yes --add react`
- DO: then run: `cd astro && npx astro add tailwind --yes`
- DO: verify `astro/package.json` contains: astro, react, react-dom, @astrojs/react, tailwindcss, @tailwindcss/vite
- DO: verify `astro/astro.config.mjs` has `react()` in integrations and `tailwindcss()` in vite.plugins
- DO: verify `astro/src/styles/global.css` contains `@import "tailwindcss";`
- DO NOT: run `git init` inside astro/ (`--no-git` prevents it; verify no `astro/.git` exists)
- DO NOT: change tsconfig.json (strict is the default)
- DO NOT: install anything else

**Success:**

- [ ] `test -d astro/src && test -f astro/package.json` → exit 0
- [ ] `test ! -d astro/.git` → exit 0 (no nested repo)
- [ ] `grep -c "tailwindcss" astro/package.json` → ≥ 2 (tailwindcss + @tailwindcss/vite)
- [ ] `grep -n "react()" astro/astro.config.mjs` → 1 match
- [ ] `grep -n "tailwindcss()" astro/astro.config.mjs` → 1 match
- [ ] `grep -n '@import "tailwindcss"' astro/src/styles/global.css` → 1 match
- [ ] `cd astro && npm run build` → exit 0
- [ ] `cd astro && npx astro check` → exit 0 (if it errors "not installed", run `npm i -D @astrojs/check typescript` first, then re-run)

### WP-2: Types, i18n, layout, language toggle

**Context:**
The scaffold from WP-1 created `astro/src/pages/index.astro` (minimal home), `astro/src/layouts/Layout.astro` (minimal), `astro/src/styles/global.css` (Tailwind import). React islands render via `client:*` directives. The gloss schema was designed in `idea/findings.md`: fields lemma, pos, ipa, ru, grammar, cefr, modern, false_friend, note — all optional except ru.

**Task:**
Create the shared types, the RU/EN i18n module, the base layout with footer (CTDev credit), the language toggle island, and replace the placeholder home page with a layout-only page.

**Files:**

- `astro/src/lib/types.ts` — CREATE
- `astro/src/lib/i18n.ts` — CREATE
- `astro/src/layouts/Layout.astro` — MODIFY (replace scaffold content)
- `astro/src/styles/global.css` — MODIFY (append reading styles)
- `astro/src/components/LangToggle.tsx` — CREATE
- `astro/src/pages/index.astro` — MODIFY (placeholder home using Layout)

**Constraints:**

- DO: `types.ts` exports exactly:

  ```ts
  export interface Gloss {
    lemma?: string; pos?: string; ipa?: string; ru: string;
    grammar?: string | null; cefr?: string | null; modern?: string | null;
    false_friend?: string | null; note?: string | null;
  }
  export interface Token { t: string; w: string | null }
  export interface ChapterMeta { id: string; title: string }
  export interface BookMeta { id: string; title: string; author: string; source: string; chapters: ChapterMeta[] }
  export type GlossLibrary = Record<string, Gloss>
  ```

- DO: `i18n.ts` exports: `type Lang = 'ru' | 'en'`, `strings: Record<Lang, Record<string, string>>` with keys: translation, grammar, lemma, pos, level, modern, falseFriend, note, close, prev, next, chapters, description. RU values: Перевод, Грамматика, Словарная форма, Часть речи, Уровень, Современный эквивалент, Ложный друг, Примечание, Закрыть, Назад, Вперёд, Главы, «Странствия и видения Испании» — сборник очерков Мигеля де Унамуно о путешествиях по Испании. EN values: Translation, Grammar, Dictionary form, Part of speech, Level, Modern equivalent, False friend, Note, Close, Previous, Next, Chapters, Andanzas y visiones españolas — Miguel de Unamuno's essay collection on travels through Spain.
- DO: `i18n.ts` also exports `getLang(): Lang` (localStorage 'lang', default 'ru'), `setLang(l: Lang)` (writes localStorage, sets `document.documentElement.lang`, notifies subscribers), `onLangChange(cb: (l: Lang) => void): () => void` (returns unsubscribe).
- DO: `Layout.astro`: `<html lang="es">`, meta charset + viewport, imports global.css, header with site title "Aprende español" and `<LangToggle client:load />`, `<slot />`, footer with the CTDev credit (exact spec in `_index.md` Conventions).
- DO: `global.css`: keep `@import "tailwindcss";` and append:

  ```css
  .glossable { text-decoration: underline dotted; text-underline-offset: 3px; text-decoration-color: #b45309; cursor: help; }
  .glossable:hover { background: #fef3c7; }
  ```

- DO: `LangToggle.tsx`: React component, useState lang from getLang(), button shows the OTHER language ("EN" when ru, "RU" when en), onClick → setLang(next) + setState. Tailwind classes: `text-xs px-2 py-1 rounded border border-stone-300 hover:bg-stone-100`.
- DO: `index.astro`: use Layout, render a centered placeholder: `<main class="min-h-screen flex items-center justify-center"><p class="text-stone-500">No books yet</p></main>`.
- DO NOT: create books.ts yet (comes in WP-4).
- DO NOT: add dark mode, routing, or any other feature.

**Success:**

- [ ] `test -f astro/src/lib/types.ts && test -f astro/src/lib/i18n.ts && test -f astro/src/components/LangToggle.tsx` → exit 0
- [ ] `grep -c "export interface Gloss" astro/src/lib/types.ts` → 1
- [ ] `grep -c "onLangChange" astro/src/lib/i18n.ts` → ≥ 1
- [ ] `grep -n "ctdev.dev" astro/src/layouts/Layout.astro` → 1 match
- [ ] `grep -n 'target="_blank"' astro/src/layouts/Layout.astro` → 1 match
- [ ] `grep -n "glossable" astro/src/styles/global.css` → ≥ 1
- [ ] `cd astro && npm run build` → exit 0
- [ ] `cd astro && npx astro check` → exit 0

## Phase Verification

After both WPs:

```bash
cd astro && npm run build
cd astro && npx astro check
```

- [ ] Build exits 0
- [ ] astro check exits 0
- [ ] Manual: `cd astro && npm run dev` → open <http://localhost:4321> → page shows "No books yet", header shows "Aprende español" + RU/EN button, footer shows "Made by CTDev" linking to <https://ctdev.dev/> (new tab)
- [ ] Commit: `git add astro/ && git commit -m "spanish-reader: phase 1 — scaffold & foundation"`
