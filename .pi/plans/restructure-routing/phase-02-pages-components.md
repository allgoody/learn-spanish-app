# Phase 2: Pages, Components & Tests

## Objective

Build the new URL structure: chooser at `/`, generic book landing at
`/books/[book]/`, generic reader at `/books/[book]/[slug]` (chapter URLs
unchanged), generic words lesson at `/words/[category]/`, plus the i18n strings,
Layout props, and component tests. After this phase the site builds with the new
structure.

## Prerequisites

- Phase 1 complete (types, meta.lang, pronouns.json, lib/words.ts)

## Shared Context

See Global Context in `_index.md`. The island pattern (from
`astro/src/components/BookIntro.tsx`): `useState<Lang>("ru")` + mount effect
`setLangState(getLang()); return onLangChange(setLangState);`. The `strings`
dict in `astro/src/lib/i18n.ts` is `Record<Lang, Record<string, string>>` with
`ru` and `en` objects. `chapterCount(n, lang)` exists. `languages` and
`categories` come from `astro/src/lib/words.ts` (WP-3). `books` comes from
`astro/src/lib/books.ts`.

**JSX convention: React components use `className` (see `BookIntro.tsx`); Astro
templates use `class`.** WP order matters: WP-6 (Layout props) comes BEFORE the
pages that pass `contentLang` to Layout — do not reorder.

## Work Packages

### WP-4: Add i18n strings for the new pages

**Context:**
`astro/src/lib/i18n.ts` has a `strings` dict with `ru` and `en` objects (keys:
translation, grammar, lemma, pos, level, modern, falseFriend, note, close, menu,
appLanguage, colorTheme, light, dark, system, description). Read the file first.

**Task:**
Add four new keys to BOTH the `ru` and `en` objects: `booksSection`,
`wordsSection`, `backToBooks`, `backHome`.

**Files:**

- `astro/src/lib/i18n.ts` — MODIFY — add 4 keys × 2 languages

**Constraints:**

- DO: Add to the `ru` object (alphabetical position: after `appLanguage`):
  - `booksSection: "Книги"`
  - `wordsSection: "Категории слов"`
  - `backToBooks: "← Все книги"`
  - `backHome: "← На главную"`
- DO: Add to the `en` object (same positions):
  - `booksSection: "Books"`
  - `wordsSection: "Word categories"`
  - `backToBooks: "← All books"`
  - `backHome: "← Home"`
- DO NOT: Change any existing key or the `description` values
- DO NOT: Change `getLang`, `setLang`, `onLangChange`, `chapterCount`, `pluralRu`

**Success:**

- [ ] `grep -c "booksSection" astro/src/lib/i18n.ts` → 2 (one per language object)
- [ ] `grep -c "wordsSection" astro/src/lib/i18n.ts` → 2
- [ ] `grep -c "backToBooks" astro/src/lib/i18n.ts` → 2
- [ ] `grep -c "backHome" astro/src/lib/i18n.ts` → 2
- [ ] No type errors: `cd astro && npx astro check` → exit 0

### WP-5: Create the Chooser island and rewrite the home page

**Context:**
`astro/src/pages/index.astro` currently renders BookIntro (`books[0]`) + a chapter
list + two JSON-LD blocks (WebSite, Organization — import `JsonLd` from
`../components/JsonLd.astro`). It will become the chooser. The island pattern is
in `BookIntro.tsx`. `languages` (from `lib/words.ts`) drives the sections;
`books` and `categories` are passed as props. `chapterCount(n, lang)` from
`lib/i18n.ts` formats the book card subtitle. Token utilities: `bg-paper`,
`text-ink`, `text-muted`, `border-line`, `bg-surface-hover`, `bg-accent`.

**Task:**
Create `astro/src/components/Chooser.tsx` and rewrite `astro/src/pages/index.astro`
to render it.

**Files:**

- `astro/src/components/Chooser.tsx` — CREATE — the chooser island
- `astro/src/pages/index.astro` — MODIFY — rewrite body to render Chooser

**Constraints:**

- DO: `Chooser.tsx` — exact component (note `className` in JSX):

```tsx
import { useEffect, useState } from "react";
import {
  getLang,
  onLangChange,
  strings,
  chapterCount,
  type Lang,
} from "../lib/i18n";
import { languages } from "../lib/words";
import type { BookMeta, WordCategory } from "../lib/types";

export default function Chooser({
  books,
  categories,
}: {
  books: BookMeta[];
  categories: WordCategory[];
}) {
  const [lang, setLangState] = useState<Lang>("ru");

  useEffect(() => {
    setLangState(getLang());
    return onLangChange(setLangState);
  }, []);

  const s = strings[lang];

  return (
    <div>
      {languages.map((l) => {
        const langBooks = books.filter((b) => b.lang === l.id);
        const langCats = categories.filter((c) => c.lang === l.id);
        if (!langBooks.length && !langCats.length) return null;
        return (
          <section key={l.id} className="mb-10">
            <h2 className="text-2xl font-bold mb-4">{l.name}</h2>
            {langBooks.length > 0 && (
              <>
                <h3 className="text-lg font-semibold mb-2">{s.booksSection}</h3>
                <ul className="space-y-3 mb-6">
                  {langBooks.map((b) => (
                    <li key={b.id}>
                      <a
                        href={`/books/${b.id}/`}
                        className="block p-4 border border-line rounded hover:border-accent hover:bg-surface-hover"
                      >
                        <div className="font-semibold">{b.title}</div>
                        <div className="text-sm text-muted">
                          {b.author} · {chapterCount(b.chapters.length, lang)}
                        </div>
                      </a>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {langCats.length > 0 && (
              <>
                <h3 className="text-lg font-semibold mb-2">{s.wordsSection}</h3>
                <ul className="space-y-3">
                  {langCats.map((c) => (
                    <li key={c.id}>
                      <a
                        href={`/words/${c.id}/`}
                        className="block p-4 border border-line rounded hover:border-accent hover:bg-surface-hover"
                      >
                        <div className="font-semibold">{c.title[lang]}</div>
                      </a>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        );
      })}
    </div>
  );
}
```

- DO: `index.astro` — keep the frontmatter imports of `Layout`, `JsonLd`; replace
  the `BookIntro` import with `Chooser` from `../components/Chooser.tsx`; add
  `import { categories } from '../lib/words'`; keep `import { books } from '../lib/books'`.
- DO: `index.astro` — keep BOTH JSON-LD blocks byte-identical (WebSite + Organization)
- DO: `index.astro` — new body (Astro template uses `class`):

```astro
<Layout
  title="Aprende español"
  description="Учите испанский язык: читайте книги с интегрированным словарём и изучайте слова по темам."
>
  <JsonLd ... (both blocks unchanged) />
  <main class="max-w-2xl mx-auto px-4 py-8">
    <h1 class="text-2xl font-bold mb-6">Aprende español</h1>
    <Chooser books={books} categories={categories} client:load />
  </main>
</Layout>
```

- DO NOT: Keep the old chapter list or BookIntro usage in index.astro
- DO NOT: Add a language filter state — sections come from `languages` data

**Success:**

- [ ] `test -f astro/src/components/Chooser.tsx` → exit 0
- [ ] `grep -n "client:load" astro/src/pages/index.astro` → 1 match
- [ ] `grep -n "BookIntro" astro/src/pages/index.astro` → 0 matches
- [ ] `grep -n "JsonLd" astro/src/pages/index.astro` → ≥ 3 matches (2 imports + 2 usages)
- [ ] No type errors: `cd astro && npx astro check` → exit 0

### WP-6: Add contentLang and description props to Layout

**Context:**
`astro/src/layouts/Layout.astro` has `<html lang="es">` and an inline no-FOUC
script that sets `data-theme` and overrides `document.documentElement.lang` from
localStorage. Per `idea/routing.md` §5, content pages (book landing, reader,
words) must keep `lang` = content language ("es") regardless of the UI setting;
chrome pages (chooser) keep the UI-language behavior. The script must skip the
lang override when the page declares a content language. This WP comes BEFORE the
pages that pass `contentLang` — do not reorder.

**Task:**
Add `contentLang?: string` and `description?: string` props to Layout; render
`lang` and a `data-content-lang` marker from `contentLang`; make the script skip
the lang override when the marker is present; use the `description` prop in the
meta tag.

**Files:**

- `astro/src/layouts/Layout.astro` — MODIFY — props, html tag, script, meta

**Constraints:**

- DO: Props interface becomes:

```ts
interface Props {
  title?: string
  description?: string
  contentLang?: string
}
```

- DO: Destructure: `const { title = 'Aprende español', description = 'Aprende español leyendo «Andanzas y visiones españolas» de Miguel de Unamuno, con glosario integrado.', contentLang } = Astro.props`
- DO: `<html lang={contentLang ?? 'es'} data-content-lang={contentLang ? '' : undefined}>`
- DO: `<meta name="description" content={description} />` (replaces the hardcoded content)
- DO: In the inline script, wrap the lang override in a guard — the script becomes:

```js
(function () {
  try {
    var t = localStorage.getItem('theme')
    if (t === 'light' || t === 'dark') {
      document.documentElement.setAttribute('data-theme', t)
    }
    if (!document.documentElement.hasAttribute('data-content-lang')) {
      var l = localStorage.getItem('lang')
      if (l === 'ru' || l === 'en') {
        document.documentElement.lang = l
      }
    }
  } catch (e) {}
})()
```

- DO NOT: Change the theme logic, header, footer, or the CTDev credit
- DO NOT: Change the `title` prop behavior

**Success:**

- [ ] `grep -n "contentLang" astro/src/layouts/Layout.astro` → ≥ 3 matches (prop, destructure, html attr)
- [ ] `grep -n "data-content-lang" astro/src/layouts/Layout.astro` → ≥ 2 matches (html attr + script guard)
- [ ] `grep -n "description" astro/src/layouts/Layout.astro` → ≥ 2 matches (prop + meta)
- [ ] No type errors: `cd astro && npx astro check` → exit 0

### WP-7: Create BookLanding and the generic book landing page

**Context:**
`astro/src/components/BookIntro.tsx` renders the book intro (h1 title, author,
description from `strings[lang].description`, `chapterCount`). It is used ONLY by
`index.astro` (rewritten in WP-5, no longer imports it). The old chapter list
markup (from the old index.astro) is: `<ul class="mt-8">` + `<li><a href={...}
class="block py-2 border-b border-line hover:text-accent">{c.title}</a></li>`.
The new landing page lives at `src/pages/books/[book]/index.astro` and must be
generic over books (see `lib/books.ts` — `books` array, `getBook`). Layout now
accepts `contentLang` (WP-6).

**Task:**
Create `astro/src/components/BookLanding.tsx` (supersedes BookIntro: adds a
localized back link and the chapter list) and delete `BookIntro.tsx`. Create
`astro/src/pages/books/[book]/index.astro`.

**Files:**

- `astro/src/components/BookLanding.tsx` — CREATE — extended BookIntro
- `astro/src/components/BookIntro.tsx` — DELETE — superseded by BookLanding
- `astro/src/pages/books/[book]/index.astro` — CREATE — generic book landing page

**Constraints:**

- DO: `BookLanding.tsx` — exact component (same island pattern as BookIntro,
  `className` in JSX):

```tsx
import { useEffect, useState } from "react";
import {
  getLang,
  onLangChange,
  strings,
  chapterCount,
  type Lang,
} from "../lib/i18n";
import type { BookMeta } from "../lib/types";

export default function BookLanding({ book }: { book: BookMeta }) {
  const [lang, setLangState] = useState<Lang>("ru");

  useEffect(() => {
    setLangState(getLang());
    return onLangChange(setLangState);
  }, []);

  const s = strings[lang];

  return (
    <div>
      <a href="/" className="text-sm text-muted hover:text-accent">
        {s.backToBooks}
      </a>
      <h1 className="text-2xl font-bold mt-2">{book.title}</h1>
      <p className="text-muted">{book.author}</p>
      <p className="mt-2 text-ink">{s.description}</p>
      <p>{chapterCount(book.chapters.length, lang)}</p>
      <ul className="mt-8">
        {book.chapters.map((c) => (
          <li key={c.id}>
            <a
              href={`/books/${book.id}/${c.id}`}
              className="block py-2 border-b border-line hover:text-accent"
            >
              {c.title}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- DO: `books/[book]/index.astro` — exact page (Astro template uses `class`):

```astro
---
import Layout from '../../../layouts/Layout.astro'
import BookLanding from '../../../components/BookLanding.tsx'
import { books } from '../../../lib/books'

export function getStaticPaths() {
  return books.map((b) => ({
    params: { book: b.id },
    props: { book: b },
  }))
}

const { book } = Astro.props
---

<Layout title={book.title} contentLang="es">
  <main class="max-w-2xl mx-auto px-4 py-8">
    <BookLanding book={book} client:load />
  </main>
</Layout>
```

- DO: Delete `BookIntro.tsx` with `rm astro/src/components/BookIntro.tsx`
- DO NOT: Add JSON-LD to the landing page
- DO NOT: Keep any reference to BookIntro anywhere

**Success:**

- [ ] `test -f astro/src/components/BookLanding.tsx` → exit 0
- [ ] `test ! -f astro/src/components/BookIntro.tsx` → exit 0
- [ ] `grep -rn "BookIntro" astro/src --include='*.tsx' --include='*.astro'` → 0 matches
- [ ] `grep -n "getStaticPaths" astro/src/pages/books/\[book\]/index.astro` → 1 match
- [ ] No type errors: `cd astro && npx astro check` → exit 0

### WP-8: Genericize the reader and delete the hardcoded route

**Context:**
`astro/src/pages/books/andanzas/[slug].astro` is the current chapter reader. It
imports `meta` from `../../../data/books/andanzas/meta.json`, globs tokens/glosses
for andanzas only, computes prev/next from `meta.chapters`, and renders the
chapter text + nav with hardcoded `/books/andanzas/` links and a hardcoded
"← Home" link. Read the FULL current file before rewriting. The generic version
lives at `src/pages/books/[book]/[slug].astro`; the old file MUST be deleted in
the same WP (two routes matching `/books/andanzas/{slug}` = build error). Layout
now accepts `contentLang` (WP-6).

**Task:**
Create `astro/src/pages/books/[book]/[slug].astro` (generic over books, chapter
URLs unchanged) and delete `astro/src/pages/books/andanzas/[slug].astro`.

**Files:**

- `astro/src/pages/books/[book]/[slug].astro` — CREATE — generic reader
- `astro/src/pages/books/andanzas/[slug].astro` — DELETE — duplicate route otherwise

**Constraints:**

- DO: Frontmatter — imports: `Layout` from `../../../layouts/Layout.astro`,
  `Reader` from `../../../components/Reader.tsx`, `{ books }` from
  `../../../lib/books`, `type { Token, GlossLibrary }` from `../../../lib/types`.
  NO `meta` import.
- DO: `getStaticPaths` — globs must live INSIDE it (isolated scope):

```ts
export function getStaticPaths() {
  const tokenFiles = import.meta.glob('../../../data/books/*/tokens/*.json', {
    eager: true,
    import: 'default',
  })
  const glossFiles = import.meta.glob('../../../data/books/*/glosses/*.json', {
    eager: true,
    import: 'default',
  })
  return books.flatMap((book) =>
    book.chapters.map((c) => ({
      params: { book: book.id, slug: c.id },
      props: {
        book,
        chapter: c,
        tokens: tokenFiles[`../../../data/books/${book.id}/tokens/${c.id}.json`] as Token[],
        glosses: glossFiles[`../../../data/books/${book.id}/glosses/${c.id}.json`] as GlossLibrary,
      },
    })),
  )
}
```

- DO: Keep `splitParagraphs` exactly as in the current file (copy it verbatim)
- DO: After the frontmatter, compute prev/next from `book.chapters` (not meta),
  exactly as the current file does but replacing `meta` with `book`:
  `const idx = book.chapters.findIndex((c) => c.id === chapter.id)`,
  `const prev = idx > 0 ? book.chapters[idx - 1] : null`,
  `const next = idx < book.chapters.length - 1 ? book.chapters[idx + 1] : null`
- DO: Template — `<Layout title={chapter.title} contentLang="es">`; keep the
  article/h1/paragraphs markup identical to the current file; nav links become
  `` `/books/${book.id}/${prev.id}` `` and `` `/books/${book.id}/${next.id}` ``;
  REPLACE the hardcoded "← Home" link with a back link to the book landing:
  `<a href={`/books/${book.id}/`} class="text-sm text-muted hover:text-accent">← {book.title}</a>`
- DO: Delete the old file: `rm 'astro/src/pages/books/andanzas/[slug].astro'`
- DO NOT: Change `Reader.tsx` or its usage (`<Reader glosses={glosses} client:load />`)
- DO NOT: Change the chapter text rendering (glossable spans, splitParagraphs)

**Success:**

- [ ] `test -f 'astro/src/pages/books/[book]/[slug].astro'` → exit 0
- [ ] `test ! -f 'astro/src/pages/books/andanzas/[slug].astro'` → exit 0
- [ ] `grep -n "books.flatMap" 'astro/src/pages/books/[book]/[slug].astro'` → 1 match
- [ ] `grep -n "contentLang" 'astro/src/pages/books/[book]/[slug].astro'` → 1 match
- [ ] `grep -rn "← Home" astro/src` → 0 matches (hardcoded English link gone)
- [ ] Build succeeds (no duplicate route): `cd astro && npm run build` → exit 0

### WP-9: Create WordLesson and the generic words page

**Context:**
The words tree: `src/pages/words/[category]/index.astro` with `getStaticPaths`
from `categories` (WP-3). The lesson content is Russian (like glosses) — group
titles/notes are plain strings from the data file; only the page title and back
link are localized. The island pattern is in `BookLanding.tsx` (WP-7). Layout
now accepts `contentLang` (WP-6).

**Task:**
Create `astro/src/components/WordLesson.tsx` and
`astro/src/pages/words/[category]/index.astro`.

**Files:**

- `astro/src/components/WordLesson.tsx` — CREATE — lesson island
- `astro/src/pages/words/[category]/index.astro` — CREATE — generic words page

**Constraints:**

- DO: `WordLesson.tsx` — exact component (`className` in JSX):

```tsx
import { useEffect, useState } from "react";
import {
  getLang,
  onLangChange,
  strings,
  type Lang,
} from "../lib/i18n";
import type { WordCategory } from "../lib/types";

export default function WordLesson({ category }: { category: WordCategory }) {
  const [lang, setLangState] = useState<Lang>("ru");

  useEffect(() => {
    setLangState(getLang());
    return onLangChange(setLangState);
  }, []);

  const s = strings[lang];

  return (
    <div>
      <a href="/" className="text-sm text-muted hover:text-accent">
        {s.backHome}
      </a>
      <h1 className="text-2xl font-bold mt-2 mb-6">{category.title[lang]}</h1>
      {category.groups.map((g) => (
        <section key={g.title} className="mb-8">
          <h2 className="text-lg font-semibold mb-2">{g.title}</h2>
          {g.note && <p className="text-sm text-muted mb-2">{g.note}</p>}
          <ul>
            {g.items.map((it) => (
              <li key={it.es} className="py-2 border-b border-line">
                <div className="flex items-baseline gap-2">
                  <span className="font-semibold">{it.es}</span>
                  <span className="text-xs text-muted">{it.pos}</span>
                </div>
                <div className="text-ink">{it.ru}</div>
                {it.grammar && <div className="text-sm text-muted">{it.grammar}</div>}
                {it.note && <div className="text-sm text-muted">{it.note}</div>}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
```

- DO: `words/[category]/index.astro` — exact page (Astro template uses `class`):

```astro
---
import Layout from '../../../layouts/Layout.astro'
import WordLesson from '../../../components/WordLesson.tsx'
import { categories } from '../../../lib/words'

export function getStaticPaths() {
  return categories.map((c) => ({
    params: { category: c.id },
    props: { category: c },
  }))
}

const { category } = Astro.props
---

<Layout
  title={category.title.ru}
  contentLang="es"
  description="Урок испанских слов с переводом и пояснениями."
>
  <main class="max-w-2xl mx-auto px-4 py-8">
    <WordLesson category={category} client:load />
  </main>
</Layout>
```

- DO NOT: Add a popup/glossable behavior — definitions are inline (decision in `idea/routing.md` §3)
- DO NOT: Add JSON-LD to the words page

**Success:**

- [ ] `test -f astro/src/components/WordLesson.tsx` → exit 0
- [ ] `test -f 'astro/src/pages/words/[category]/index.astro'` → exit 0
- [ ] `grep -n "getStaticPaths" 'astro/src/pages/words/[category]/index.astro'` → 1 match
- [ ] `grep -n "contentLang" 'astro/src/pages/words/[category]/index.astro'` → 1 match
- [ ] No type errors: `cd astro && npx astro check` → exit 0

### WP-10: Component tests for the new islands

**Context:**
The test convention is in `astro/test/components/HeaderMenu.test.tsx`: vitest +
@testing-library/react + jest-dom matchers, `localStorage.clear()` in
`beforeEach`. Islands render RU by default (server default) — assert RU strings.
`books` comes from `../../src/lib/books`, `categories` from `../../src/lib/words`.
The `setup.ts` already provides the matchMedia mock.

**Task:**
Create three test files: `Chooser.test.tsx`, `BookLanding.test.tsx`,
`WordLesson.test.tsx`.

**Files:**

- `astro/test/components/Chooser.test.tsx` — CREATE
- `astro/test/components/BookLanding.test.tsx` — CREATE
- `astro/test/components/WordLesson.test.tsx` — CREATE

**Constraints:**

- DO: `Chooser.test.tsx` — exact content:

```tsx
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import Chooser from "../../src/components/Chooser";
import { books } from "../../src/lib/books";
import { categories } from "../../src/lib/words";

describe("Chooser", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders the language section and section headers", () => {
    render(<Chooser books={books} categories={categories} />);
    expect(screen.getByRole("heading", { name: "Español" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Книги" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Категории слов" }),
    ).toBeInTheDocument();
  });

  it("links to the book landing and the words lesson", () => {
    render(<Chooser books={books} categories={categories} />);
    expect(
      screen.getByRole("link", { name: /Andanzas y visiones españolas/ }),
    ).toHaveAttribute("href", "/books/andanzas/");
    expect(screen.getByRole("link", { name: "Местоимения" })).toHaveAttribute(
      "href",
      "/words/pronouns/",
    );
  });
});
```

- DO: `BookLanding.test.tsx` — exact content:

```tsx
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import BookLanding from "../../src/components/BookLanding";
import { books } from "../../src/lib/books";

describe("BookLanding", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders the book title and the back link", () => {
    render(<BookLanding book={books[0]} />);
    expect(
      screen.getByRole("heading", { name: "Andanzas y visiones españolas" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "← Все книги" })).toHaveAttribute(
      "href",
      "/",
    );
  });

  it("links to the first chapter", () => {
    render(<BookLanding book={books[0]} />);
    expect(screen.getByRole("link", { name: "Prólogo" })).toHaveAttribute(
      "href",
      "/books/andanzas/prologo",
    );
  });
});
```

- DO: `WordLesson.test.tsx` — exact content:

```tsx
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import WordLesson from "../../src/components/WordLesson";
import { categories } from "../../src/lib/words";

describe("WordLesson", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders the lesson title and the back link", () => {
    render(<WordLesson category={categories[0]} />);
    expect(
      screen.getByRole("heading", { name: "Местоимения" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "← На главную" })).toHaveAttribute(
      "href",
      "/",
    );
  });

  it("renders a word with its inline gloss", () => {
    render(<WordLesson category={categories[0]} />);
    expect(screen.getByText("yo")).toBeInTheDocument();
    expect(screen.getByText("я")).toBeInTheDocument();
  });
});
```

- DO: Follow the import style of `HeaderMenu.test.tsx` (double quotes, semicolons)
- DO NOT: Test lang switching — the pattern is already covered by the existing island tests
- DO NOT: Add tests for the reader page (unchanged behavior)

**Success:**

- [ ] All three files exist: `ls astro/test/components/Chooser.test.tsx astro/test/components/BookLanding.test.tsx astro/test/components/WordLesson.test.tsx` → 3 files
- [ ] Tests pass: `cd astro && npx vitest run test/components/Chooser.test.tsx test/components/BookLanding.test.tsx test/components/WordLesson.test.tsx` → exit 0
- [ ] Full suite passes: `cd astro && npm test` → exit 0

## Phase Verification

After all work packages are complete, run:

```bash
cd astro && npx astro check
cd astro && npm run build
cd astro && npm test
```

- [ ] `astro check` exits 0
- [ ] `npm run build` exits 0 — build output must include the new routes:
  `ls astro/dist/books/andanzas/` shows `index.html` + 41 chapter HTML files;
  `ls astro/dist/words/pronouns/` shows `index.html`
- [ ] `npm test` exits 0 (all tests, old + new)
