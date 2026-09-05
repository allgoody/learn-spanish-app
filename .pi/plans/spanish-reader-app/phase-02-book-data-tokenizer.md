# Phase 2: Book Data & Tokenizer

## Objective

Extract the 41 essays from the Gutenberg text into clean chapter files, build the book registry + home page, and implement the tokenizer with longest-match phrase recognition (with tests). The site now shows the book and its chapters.

## Prerequisites

- Phase 1 complete (astro/ scaffolded, build + check pass)
- `.tmp/pg78052.txt` exists at repo root (already downloaded)

## Shared Context

See Global Context in `_index.md` for the exact Gutenberg text structure (START marker line 28, ÍNDICE line 178, body starts at PRÓLOGO ~line 262, END marker line 8205, `_italic_` and `=bold=` markers, all-caps essay title lines, one two-line title, signature line MIGUEL DE UNAMUNO).

## Work Packages

### WP-3: Fetch & clean script

**Context:**
The Gutenberg text is at repo root `.tmp/pg78052.txt` (relative to astro/: `../.tmp/pg78052.txt`). Verified structure: front matter (header, NOTAS DEL TRANSCRIPTOR, bibliography, dedication) sits between the START marker and the ÍNDICE; the ÍNDICE lists 41 titles (PRÓLOGO + 40 essays) with trailing page numbers, one entry wraps to a continuation line; the body starts at the all-caps line `PRÓLOGO`; each essay starts with an all-caps title line matching an index title (case-insensitive), one title spans two all-caps lines; the END marker closes the body.

**Task:**
Create `astro/scripts/fetch-book.mjs` that reads the Gutenberg text, strips front matter and footer, extracts the 41 index titles, splits the body into 41 sections by matching all-caps title lines against index titles, strips `_..._` and `=...=` markers, and writes `meta.json` + `chapters/{id}.txt`. Then run it.

**Files:**

- `astro/scripts/fetch-book.mjs` — CREATE
- `astro/src/data/books/andanzas/meta.json` — CREATE (generated)
- `astro/src/data/books/andanzas/chapters/{id}.txt` — CREATE (generated, 41 files)

**Constraints:**

- DO: input default `../.tmp/pg78052.txt` (relative to astro/); if missing, download from `https://www.gutenberg.org/cache/epub/78052/pg78052.txt` to that path. Support `--input <path>` override.
- DO: output dir default `src/data/books/andanzas` (relative to astro/); `mkdir -p` the chapters dir. Support `--output <dir>` override.
- DO: implement exactly this algorithm:
  1. Read file as utf-8, split into lines.
  2. Find START line (contains `*** START OF THE PROJECT GUTENBERG EBOOK`) and END line (contains `*** END OF THE PROJECT GUTENBERG EBOOK`). Slice between them (exclusive).
  3. Find the line whose trimmed content is exactly `ÍNDICE`. Everything before it is front matter — discard.
  4. Find the first line after the ÍNDICE whose trimmed content is exactly `PRÓLOGO` — this is the body start.
  5. Index titles: take lines between ÍNDICE and body start. Skip empty lines and the line `Pág.`. For each remaining line: trim; if it ends with digits (page number), it COMPLETES an entry: strip the digits and trim; if a pending continuation exists, prepend it with a single space; push the entry. If the line has NO trailing page number, it STARTS a wrapped entry — hold it as `pending` (if `pending` already holds text, append with a single space). Result: ordered array of 41 titles.
  6. Body: iterate lines from body start to END. Maintain `currentTitle = null` and `sections = []`. For each line: `trimmed = line.trim()`; if `currentTitle === null` and `trimmed === 'PRÓLOGO'` → start section 0 with title `Prólogo`; else if `trimmed` equals (case-insensitive, exact match after trim) the next unconsumed index title → start a new section with that index title (use the index title's original casing); else if `trimmed + ' ' + nextLine.trim()` equals (case-insensitive) the next unconsumed index title → start a new section with that index title AND skip the next line (two-line title, e.g. `EL CRISTO YACENTE DE SANTA CLARA` + `(IGLESIA DE LA CRUZ) DE PALENCIA`); else append the line to the current section's raw lines. If a title from the index is never found in the body, print `WARNING: section not found: <title>` and continue.
  7. Clean each section: replace `_([^_]+)_` with `$1` and `=([^=]+)=` with `$1` (regex, global); collapse 3+ consecutive blank lines to 1; trim trailing whitespace on every line; trim leading blank lines; join with `\n`; ensure the text ends with a single `\n`.
  8. Chapter id: slugify the title — lowercase, strip accents (á→a, é→e, í→i, ó→o, ú→u, ü→u, ñ→n), replace every run of non-alphanumeric chars with `-`, trim leading/trailing `-`. (`Prólogo` → `prologo`, `De vuelta de la cumbre` → `de-vuelta-de-la-cumbre`.)
  9. Write `meta.json`: `{ "id": "andanzas", "title": "Andanzas y visiones españolas", "author": "Miguel de Unamuno", "source": "Project Gutenberg #78052", "chapters": [{ "id": ..., "title": ... }] }` (41 entries, in order).
  10. Write `chapters/{id}.txt` per section.
  11. Print summary: `Sections: 41`, per-section word counts, total words.
- DO NOT: modify the essay text beyond the marker stripping and whitespace normalization (no spelling fixes, no re-wrapping).
- DO NOT: include the ÍNDICE, bibliography, dedication, or transcriptor notes in any chapter.

**Success:**

- [ ] `cd astro && node scripts/fetch-book.mjs` → prints `Sections: 41`
- [ ] `cd astro && node -e "const m=require('./src/data/books/andanzas/meta.json'); console.log(m.chapters.length)"` → `41`
- [ ] `cd astro && node -e "const m=require('./src/data/books/andanzas/meta.json'); console.log(m.chapters[0].title)"` → `Prólogo`
- [ ] `cd astro && node -e "const m=require('./src/data/books/andanzas/meta.json'); console.log(m.chapters[1].title)"` → `Recuerdo de la Granja de Moreruela`
- [ ] `grep -ri "project gutenberg" astro/src/data/books/andanzas/chapters/` → no matches (exit 1)
- [ ] `grep -rl "_" astro/src/data/books/andanzas/chapters/ | head -1` → no output (no underscore markers left)
- [ ] `ls astro/src/data/books/andanzas/chapters/ | wc -l` → `41`
- [ ] Total words across chapters > 60000: `cd astro && node -e "const fs=require('fs');const d='src/data/books/andanzas/chapters/';let n=0;for(const f of fs.readdirSync(d))n+=fs.readFileSync(d+f,'utf8').split(/\s+/).length;console.log(n)"` → > 60000

### WP-4: Book registry + home page

**Context:**
`meta.json` now exists at `astro/src/data/books/andanzas/meta.json` (41 chapters). `src/lib/i18n.ts` has `getLang()`, `onLangChange()`, `chapterCount()`, and the `description` string in ru/en. The placeholder home page from WP-2 is at `src/pages/index.astro`.

**Task:**
Create the book registry module and replace the placeholder home page with the book home: book card (title, author, description in current language, chapter count) + chapter list linking to `/books/andanzas/{id}`.

**Files:**

- `astro/src/lib/books.ts` — CREATE
- `astro/src/components/BookIntro.tsx` — CREATE
- `astro/src/pages/index.astro` — MODIFY (replace placeholder)

**Constraints:**

- DO: `books.ts` exports `books: BookMeta[]` — import `andanzasMeta from '../data/books/andanzas/meta.json'` and export `[andanzasMeta]`. Also export `getBook(id: string): BookMeta | undefined`.
- DO: `BookIntro.tsx`: React island, props `{ book: BookMeta }`; useState lang from getLang(); subscribes via onLangChange (useEffect, cleanup with the returned unsubscribe); renders: h1 book.title, p book.author, p strings[lang].description, p chapterCount(book.chapters.length, lang). Tailwind: h1 `text-2xl font-bold`, author `text-stone-500`, description `mt-2 text-stone-700`.
- DO: `index.astro`: use Layout; render `<main class="max-w-2xl mx-auto px-4 py-8">` with `<BookIntro book={books[0]} client:load />` and a chapter list: `<ul>` of links `<a href={/books/andanzas/${c.id}}>` with chapter titles, styled `block py-2 border-b border-stone-200 hover:text-amber-700`.
- DO NOT: hardcode the chapter list — always read from `books[0].chapters`.
- DO NOT: create the chapter page yet (WP-8) — links may 404 until then.

**Success:**

- [ ] `grep -n "meta.json" astro/src/lib/books.ts` → 1 match
- [ ] `grep -c "client:load" astro/src/pages/index.astro` → ≥ 1
- [ ] `cd astro && npm run build` → exit 0
- [ ] Manual: `cd astro && npm run dev` → <http://localhost:4321> shows book title, author, RU description, "41 глава" (or "41 chapters" after toggling EN), and 41 chapter links

### WP-5: Tokenizer + tests

**Context:**
The gloss pipeline (Phase 3) and the reader (Phase 4) both depend on tokenization. The tokenizer is plain ESM in `astro/scripts/lib/` so the pipeline script can import it without a TS runner. Vitest is not yet installed. Gloss key rules are in `_index.md` Global Context (lowercase, accents kept, numbers/punctuation → null).

**Task:**
Create the tokenizer module with longest-match phrase recognition, install vitest, and write tests covering the specified cases.

**Files:**

- `astro/scripts/lib/tokenize.mjs` — CREATE
- `astro/test/tokenize.test.mjs` — CREATE
- `astro/package.json` — MODIFY (add vitest devDep + `test` script)

**Constraints:**

- DO: install vitest: `cd astro && npm i -D vitest`
- DO: add `"test": "vitest run"` to package.json scripts.
- DO: `tokenize.mjs` exports `tokenize(text: string, phrases: string[]): Array<{t: string, w: string | null}>`:
  - Sort phrases by length descending (longest first).
  - Scan `text` left to right. At each position:
    1. For each phrase: if `text` at this position starts with the phrase (case-insensitive) AND the character before the match (if any) is not a word char AND the character after the match (if any) is not a word char → emit `{t: <matched substring as it appears in text>, w: <phrase lowercased>}`, advance by the matched length, break.
    2. Else if the current char is a word char (regex `[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]`): match the full word with `/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+/`; if the word is all digits → `w: null`; else `w: <word lowercased>`; emit `{t: <word>, w}`, advance.
    3. Else: emit `{t: <single char>, w: null}`, advance by 1.
  - Word char for boundary checks: `/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9]/`.
- DO: `tokenize.test.mjs` imports `{ tokenize }` from `../scripts/lib/tokenize.mjs` and `{ describe, it, expect }` from `vitest`. Tests (exact expected arrays):
  1. `tokenize("A pesar de todo, hablaba despacio.", ["a pesar de"])` → `[{t:"A pesar de",w:"a pesar de"},{t:" ",w:null},{t:"todo",w:"todo"},{t:",",w:null},{t:" ",w:null},{t:"hablaba",w:"hablaba"},{t:" ",w:null},{t:"despacio",w:"despacio"},{t:".",w:null}]`
  2. `tokenize("Habló.", [])` → `[{t:"Habló",w:"habló"},{t:".",w:null}]` (accents kept in key)
  3. `tokenize("a pesares", ["a pesar de"])` → `[{t:"a",w:"a"},{t:" ",w:null},{t:"pesares",w:"pesares"}]` (no phrase match mid-word)
  4. `tokenize("A PESAR DE todo", ["a pesar de"])` → `[{t:"A PESAR DE",w:"a pesar de"},{t:" ",w:null},{t:"todo",w:"todo"}]` (case-insensitive)
  5. `tokenize("a pesar del viento", ["a pesar de"])` → `[{t:"a",w:"a"},{t:" ",w:null},{t:"pesar",w:"pesar"},{t:" ",w:null},{t:"del",w:"del"},{t:" ",w:null},{t:"viento",w:"viento"}]` (boundary: "del" blocks the phrase)
  6. `tokenize("En 1911 fui.", [])` → `[{t:"En",w:"en"},{t:" ",w:null},{t:"1911",w:null},{t:" ",w:null},{t:"fui",w:"fui"},{t:".",w:null}]` (numbers → null)
- DO NOT: add any other exports to tokenize.mjs.
- DO NOT: add other tests.

**Success:**

- [ ] `cd astro && npm test` → all 6 tests pass, exit 0
- [ ] `grep -c "export function tokenize" astro/scripts/lib/tokenize.mjs` → 1
- [ ] `grep -c '"test"' astro/package.json` → 1
- [ ] `cd astro && npm run build` → exit 0

## Phase Verification

```bash
cd astro && npm test
cd astro && npm run build
cd astro && npx astro check
```

- [ ] All 6 tokenizer tests pass
- [ ] Build exits 0
- [ ] astro check exits 0
- [ ] Manual: home page shows the book with 41 chapter links
- [ ] Commit: `git add astro/ && git commit -m "spanish-reader: phase 2 — book data & tokenizer"`
