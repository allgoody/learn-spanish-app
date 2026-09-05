# Phase 4: Reader UI

## Objective

Build the chapter reader: a static chapter page rendering every token as a span (glossable words get `data-word` + dotted underline), a React island with one delegated handler showing a tooltip (desktop hover) or bottom sheet (mobile tap) with the full gloss, prev/next navigation, and RU/EN labels. Final verification of the whole app.

## Prerequisites

- Phase 3 complete (tokens + glosses exist for all 41 chapters)
- If the user deferred gloss generation (WP-7 stop path), this phase cannot run — report that instead.

## Shared Context

See Global Context in `_index.md`. Gloss keys may contain spaces (phrases) — they are valid HTML attribute values. The Reader island receives the per-chapter gloss library as a prop; the page renders the text statically (no client rendering of the text itself).

## Work Packages

### WP-8: Chapter page

**Context:**
`src/data/books/andanzas/meta.json` has 41 chapters. `tokens/{id}.json` and `glosses/{id}.json` exist per chapter. `src/lib/books.ts` exports `getBook()`. `Layout.astro` has a header + footer. The route pattern: `/books/andanzas/{slug}`.

**Task:**
Create the dynamic chapter page that renders the tokenized text as static spans and mounts the Reader island with the per-chapter gloss library.

**Files:**

- `astro/src/pages/books/andanzas/[slug].astro` — CREATE

**Constraints:**

- DO: frontmatter:
  - `import Layout from '../../../layouts/Layout.astro'` and `import Reader from '../../../components/Reader.tsx'` (created in WP-9 — the page may be written before Reader.tsx exists, but the build check runs after WP-9).
  - `import meta from '../../../data/books/andanzas/meta.json'`
  - `const tokenFiles = import.meta.glob('../../../data/books/andanzas/tokens/*.json', { eager: true, import: 'default' })` and the same for `glosses/`.
  - `getStaticPaths()`: map `meta.chapters` → `{ params: { slug: c.id }, props: { chapter: c, tokens, glosses } }` where tokens/glosses are looked up from the globs by id (key = `../../../data/books/andanzas/tokens/{id}.json`).
- DO: template: `<Layout title={chapter.title}>`; `<article class="max-w-2xl mx-auto px-4 py-8">`; `<h1 class="text-2xl font-bold mb-6">{chapter.title}</h1>`; the text: split the token array into paragraphs in frontmatter (a small `splitParagraphs(tokens)` helper: start a new paragraph when 2+ consecutive `\n` tokens occur, drop the newline tokens) and render each paragraph as its own `<p class="text-lg leading-relaxed text-stone-800 mb-4">` containing `{para.map(tok => tok.w ? <span class="glossable" data-word={tok.w} tabindex="0" role="button">{tok.t}</span> : tok.t)}`; prev/next links at the bottom (use plain "←" / "→" with the neighbor chapter titles — language-neutral, no i18n needed); a back link to `/`.
- DO: mount `<Reader glosses={glosses} client:load />` once per page (renders nothing until a word is activated).
- DO: `<html lang="es">` comes from Layout (already set).
- DO NOT: render the text inside the React island — the spans are static Astro output.
- DO NOT: add per-word React components, event attributes on spans, or any client JS on the spans themselves.

**Success:**

- [ ] `test -f "astro/src/pages/books/andanzas/[slug].astro"` → exit 0
- [ ] `grep -c "getStaticPaths" "astro/src/pages/books/andanzas/[slug].astro"` → 1
- [ ] `grep -c "data-word" "astro/src/pages/books/andanzas/[slug].astro"` → ≥ 1
- [ ] `grep -c "import.meta.glob" "astro/src/pages/books/andanzas/[slug].astro"` → 2
- [ ] `grep -c "splitParagraphs" "astro/src/pages/books/andanzas/[slug].astro"` → ≥ 1
- [ ] `grep -c "tabindex" "astro/src/pages/books/andanzas/[slug].astro"` → ≥ 1
- [ ] `cd astro && npm run build` → exit 0 (after WP-9; if Reader.tsx is missing, this fails — run WP-9 first if needed)

### WP-9: Reader island (popup + bottom sheet)

**Context:**
The chapter page renders static spans with `data-word` attributes and mounts `<Reader glosses={...} client:load />`. `src/lib/i18n.ts` provides `getLang()`, `onLangChange()`, `strings`. The Gloss type is in `src/lib/types.ts`. The popup must work on touch (tap → bottom sheet) and hover-capable (hover → tooltip, click → pin) devices.

**Task:**
Create the Reader React island: one delegated event handler on `document` for click + mouseover/mouseout, a tooltip (desktop) / bottom sheet (mobile) showing the full gloss with RU/EN labels, closing on outside click, Esc, or scroll.

**Files:**

- `astro/src/components/Reader.tsx` — CREATE

**Constraints:**

- DO: props: `{ glosses: GlossLibrary }`.
- DO: state: `open: { key: string; el: HTMLElement } | null`, `lang: Lang` (from getLang(), subscribed via onLangChange in useEffect with cleanup).
- DO: on mount, compute `isHover = window.matchMedia('(hover: hover)').matches` once.
- DO: `popupRef = useRef<HTMLDivElement>(null)` on the popup container; every close-on-outside rule below first checks `if (popupRef.current?.contains(e.target as Node)) return;` so interacting with the popup itself never closes it.
- DO: document-level listeners (added in useEffect, removed in cleanup):
  - `click`: `const el = (e.target as HTMLElement).closest('[data-word]')`; if el → setOpen({key: el.getAttribute('data-word')!, el}) (toggle: clicking the same word closes); else if the target is NOT inside the popup → setOpen(null).
  - `mouseover` (only if isHover): if target closest `[data-word]` → setOpen (hover shows tooltip); if the pointer moves to a non-glossable element outside the popup AND the open popup is not pinned → setOpen(null). Track pinned state: a click in hover mode pins (open stays after mouseout); clicking the same word or outside unpins.
  - `keydown`: Escape → setOpen(null); Enter or Space on a focused glossable span (`(e.target as HTMLElement).closest('[data-word]')`) → preventDefault + setOpen (keyboard access).
  - `scroll` (capture, only when open): if the scroll target is NOT inside the popup → setOpen(null) — scrolling the page closes the sheet, scrolling inside the sheet does not.
- DO: popup rendering:
  - If `!open` → render `null`.
  - `const gloss = glosses[open.key]`; if missing → render a small "—" popup with the word only (defensive).
  - Tooltip (isHover): `<div ref={popupRef} role="dialog" aria-label={open.key} class="fixed z-50 ...">` positioned above the word: `left = clamp(rect.left + rect.width/2 - 160, 8, window.innerWidth - 328)`, `top = rect.top - 12`, with `transform: translateY(-100%)`. Use `useLayoutEffect` + a ref to measure the popup height and adjust `top` if it would overflow the viewport top (clamp to 8).
  - Sheet (touch): `<div ref={popupRef} role="dialog" aria-label={open.key} class="fixed inset-x-0 bottom-0 z-50 max-h-[60vh] overflow-y-auto rounded-t-2xl border-t bg-white p-4 shadow-xl">` with a close button.
  - Content (both): the surface word (from `open.el.textContent`), then rows with labels from `strings[lang]`: `ipa` (monospace), `ru` (large, `text-lg`), `grammar`, `lemma` + `pos`, `cefr` (badge), `modern`, `false_friend` (amber warning style), `note`. Skip rows whose value is null/undefined. Label + value layout: `<div class="text-xs text-stone-500">{label}</div><div>{value}</div>`.
- DO: Tailwind classes for tooltip: `w-80 max-w-[calc(100vw-16px)] rounded-lg bg-stone-900 p-3 text-sm text-stone-50 shadow-lg`.
- DO NOT: attach listeners to individual spans. DO NOT: use a portal library. DO NOT: add animations beyond a simple `transition-opacity`.
- DO NOT: implement known-words tracking, audio, or SRS — out of v1 scope.

**Success:**

- [ ] `test -f astro/src/components/Reader.tsx` → exit 0
- [ ] `grep -c "closest" astro/src/components/Reader.tsx` → ≥ 1
- [ ] `grep -c "addEventListener" astro/src/components/Reader.tsx` → ≥ 2
- [ ] `grep -c "onLangChange" astro/src/components/Reader.tsx` → ≥ 1
- [ ] `grep -c "popupRef" astro/src/components/Reader.tsx` → ≥ 1
- [ ] `grep -c "contains" astro/src/components/Reader.tsx` → ≥ 1
- [ ] `cd astro && npx astro check` → exit 0
- [ ] `cd astro && npm run build` → exit 0
- [ ] Manual (dev server): open a chapter page → hover a word (desktop) shows tooltip with ru + grammar; click pins it; Esc closes; in mobile emulation (DevTools 375px), tap a word shows the bottom sheet; tapping outside closes; the RU/EN toggle switches popup labels

### WP-10: Final verification

**Context:**
All phases are complete. The app should be fully functional. This WP is the final gate.

**Task:**
Run the full verification suite and the manual checklist. Fix anything that fails.

**Files:**

- none (verification only)

**Constraints:**

- DO: run all commands from `astro/`.
- DO: fix any failure found (build errors, type errors, test failures) before declaring done.
- DO NOT: add features during this WP.

**Success:**

- [ ] `cd astro && npm test` → exit 0 (6 tokenizer tests)
- [ ] `cd astro && npx astro check` → exit 0
- [ ] `cd astro && npm run build` → exit 0
- [ ] `grep -n "ctdev.dev" astro/src/layouts/Layout.astro` → 1 match (footer credit present)
- [ ] Manual checklist (dev server):
  - [ ] `/` shows the book card + 41 chapter links
  - [ ] `/books/andanzas/prologo` renders the prólogo with dotted underlines on glossable words
  - [ ] Hover (desktop) shows the tooltip; click pins; Esc closes; hovering the tooltip itself does NOT close it
  - [ ] Tap (mobile viewport) shows the bottom sheet; outside tap closes; tapping/scrolling inside the sheet does NOT close it
  - [ ] Tab to a glossable word, press Enter → popup opens; Esc closes
  - [ ] RU/EN toggle switches popup labels; gloss content stays Russian
  - [ ] Prev/next navigation between chapters works
  - [ ] No console errors on any page
  - [ ] Footer shows "Made by CTDev" → <https://ctdev.dev/> (new tab)

## Phase Verification

```bash
cd astro && npm test && npx astro check && npm run build
```

- [ ] All checks pass
- [ ] Manual checklist complete
- [ ] Commit: `git add astro/ && git commit -m "spanish-reader: phase 4 — reader UI"`
