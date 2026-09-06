# Phase 3: Wire into App + Verify

## Objective

Make the new book visible in the app (one-line wiring in `lib/books.ts`),
add data-shape + gloss-coverage tests, run the full verification suite
(vitest, astro check, build), and record the completion in `.pi/CONTEXT.md`.

## Prerequisites

- Phase 2 complete: `glosses.json` + `tokens/` + `glosses/` present for selva
- 78 existing tests passing (baseline from the last audit session)

## Shared Context

`astro/src/lib/books.ts` is the only wiring point — it currently imports
`andanzasMeta` and exports `books: BookMeta[] = [andanzasMeta]`. The home
page Chooser and the `/books/[book]/` pages all read this array. The existing
data-shape test convention is `astro/test/data/words/pronouns.test.ts` (vitest,
`describe`/`it`/`expect`, imports data via `src/lib/...` or JSON imports).
Vitest runs from `astro/`; JSON imports work; for filesystem access use
`fileURLToPath(new URL("...", import.meta.url))` (ESM — `__dirname` is not
available in vitest).

## Work Packages

### WP-7: Wire the book into lib/books.ts

**Context:**
`astro/src/lib/books.ts` currently contains:

```ts
import andanzasMeta from "../data/books/andanzas/meta.json";
import type { BookMeta } from "./types";

export const books: BookMeta[] = [andanzasMeta];

export function getBook(id: string): BookMeta | undefined {
  return books.find((b) => b.id === id);
}
```

**Task:**
Add the selva import and append it to the `books` array (after andanzas —
book #1 stays first).

**Files:**

- `astro/src/lib/books.ts` — MODIFY — add `import selvaMeta from "../data/books/selva/meta.json";` and change the array to `[andanzasMeta, selvaMeta]`

**Constraints:**

- DO: keep the existing import style (default JSON import)
- DO: keep andanzas first in the array
- DO NOT: change anything else in the file
- DO NOT: touch `getBook`

**Success:**

- [ ] Grep: `grep -n "selvaMeta" astro/src/lib/books.ts` → 2 matches (import + array entry)
- [ ] Grep: `grep -n "books: BookMeta\[\]" astro/src/lib/books.ts` → 1 match, line contains `[andanzasMeta, selvaMeta]`
- [ ] Type check: `cd astro && npx astro check` → exit 0, no new errors

### WP-8: Create the selva data-shape test

**Context:**
Follow the style of `astro/test/data/words/pronouns.test.ts` (read it first).
The test imports `meta` from the selva `meta.json` and uses `node:fs` +
`node:url` for file checks. Expected slugs (from `_index.md` Conventions):
`la-tortuga-gigante`, `las-medias-de-los-flamencos`, `el-loro-pelado`,
`la-guerra-de-los-yacares`, `la-gama-ciega`,
`historia-de-dos-cachorros-de-coati-y-de-dos-cachorros-de-hombre`,
`el-paso-del-yabebiri`, `la-abeja-haragana`.

**Task:**
Create `astro/test/data/books/selva.test.ts` with EXACTLY this content:

```ts
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import meta from "../../../src/data/books/selva/meta.json";

const DATA = fileURLToPath(
  new URL("../../../src/data/books/selva/", import.meta.url),
);

const EXPECTED_SLUGS = [
  "la-tortuga-gigante",
  "las-medias-de-los-flamencos",
  "el-loro-pelado",
  "la-guerra-de-los-yacares",
  "la-gama-ciega",
  "historia-de-dos-cachorros-de-coati-y-de-dos-cachorros-de-hombre",
  "el-paso-del-yabebiri",
  "la-abeja-haragana",
];

describe("selva book data shape", () => {
  it("is the selva book: 8 chapters, es, Quiroga", () => {
    expect(meta.id).toBe("selva");
    expect(meta.lang).toBe("es");
    expect(meta.title).toBe("Cuentos de la selva");
    expect(meta.author).toBe("Horacio Quiroga");
    expect(meta.source).toBeTruthy();
    expect(meta.chapters).toHaveLength(8);
  });

  it("chapter ids match the expected slugs in order", () => {
    expect(meta.chapters.map((c) => c.id)).toEqual(EXPECTED_SLUGS);
  });

  it("every chapter file exists, is non-empty, and is 300-8000 words", () => {
    for (const c of meta.chapters) {
      const text = readFileSync(`${DATA}chapters/${c.id}.txt`, "utf8");
      expect(text.trim().length, `chapter ${c.id}`).toBeGreaterThan(0);
      const words = text.split(/\s+/).filter(Boolean).length;
      expect(words, `chapter ${c.id}`).toBeGreaterThanOrEqual(300);
      expect(words, `chapter ${c.id}`).toBeLessThanOrEqual(8000);
    }
  });

  it("every chapter has tokens and glosses files", () => {
    for (const c of meta.chapters) {
      const tokens = JSON.parse(
        readFileSync(`${DATA}tokens/${c.id}.json`, "utf8"),
      );
      const glosses = JSON.parse(
        readFileSync(`${DATA}glosses/${c.id}.json`, "utf8"),
      );
      expect(Array.isArray(tokens), `tokens ${c.id}`).toBe(true);
      expect(tokens.length, `tokens ${c.id}`).toBeGreaterThan(0);
      expect(typeof glosses, `glosses ${c.id}`).toBe("object");
    }
  });

  it("every distinct token key has a gloss in glosses.json", () => {
    const glosses = JSON.parse(
      readFileSync(`${DATA}glosses.json`, "utf8"),
    ) as Record<string, unknown>;
    const missing = new Set<string>();
    for (const c of meta.chapters) {
      const tokens = JSON.parse(
        readFileSync(`${DATA}tokens/${c.id}.json`, "utf8"),
      ) as { t: string; w: string | null }[];
      for (const tok of tokens) {
        if (tok.w && !(tok.w in glosses)) missing.add(tok.w);
      }
    }
    expect([...missing]).toEqual([]);
  });

  it("glosses 'tortuga' with a Russian translation and lemma", () => {
    const glosses = JSON.parse(
      readFileSync(`${DATA}glosses.json`, "utf8"),
    ) as Record<string, { ru?: string; lemma?: string }>;
    const g = glosses["tortuga"];
    expect(g).toBeTruthy();
    expect(g.ru?.trim()).toBeTruthy();
    expect(g.lemma?.trim()).toBeTruthy();
  });
});
```

**Files:**

- `astro/test/data/books/selva.test.ts` — CREATE — 6 tests

**Constraints:**

- DO: copy the test content exactly as given
- DO: use `fileURLToPath(new URL(...))` for the data dir — `__dirname` does not exist in vitest ESM
- DO NOT: add tests beyond the 6 given
- DO NOT: modify any existing test file

**Success:**

- [ ] File exists: `test -f astro/test/data/books/selva.test.ts` → exit 0
- [ ] Tests pass: `cd astro && npx vitest run test/data/books/selva.test.ts` → exit 0, 6 passed

### WP-9: Full verification suite

**Context:**
All phases are done. The baseline was: 78 tests, `astro check` 0 errors,
build 44 pages. Expected now: 78 + 6 (wikisource-parse) + 6 (selva) = 90
tests, and 44 + 9 = 53 pages (1 landing + 8 chapters).

**Task:**
Run the full suite from `astro/` (`cd astro` first — the one permitted
exception to the repo-root rule):

1. `cd astro && npx vitest run` → all tests pass (90 total)
2. `cd astro && npx astro check` → exit 0, no errors
3. `cd astro && npm run build` → succeeds; the page list includes the 9 new pages
4. Verify the built output:
   - `test -f astro/dist/books/selva/index.html` → exit 0
   - `test -f astro/dist/books/selva/la-tortuga-gigante/index.html` → exit 0
   - `grep -c "data-word=\"tortuga\"" astro/dist/books/selva/la-tortuga-gigante/index.html` → ≥ 1 (reader rendered word spans)
   - `grep -c "tortuga" astro/dist/books/selva/la-tortuga-gigante/index.html` → ≥ 2 (gloss data inlined)

**Files:**

- (none — verification only)

**Constraints:**

- DO: run all commands from `astro/` — `cd astro` first (the commands below
  assume that cwd; this is the one permitted exception to the repo-root rule)
- DO: if any check fails, fix the cause before moving on — do not skip
- DO NOT: deploy the build
- DO NOT: run Lighthouse or the audit skills — out of scope for this plan

**Success:**

- [ ] `cd astro && npx vitest run` → exit 0, 90 passed
- [ ] `cd astro && npx astro check` → exit 0
- [ ] `cd astro && npm run build` → exit 0, 53 pages listed
- [ ] All 4 dist checks pass

### WP-10: Record completion in .pi/CONTEXT.md

**Context:**
`.pi/CONTEXT.md` is the session handoff doc (project rule: it must persist
and stay current). It has a "Completed This Session" checklist, a "File Map"
section, and a "Next Steps" list. Read it before editing.

**Task:**
Update `.pi/CONTEXT.md`:

1. In "Completed This Session", add:
   `- [x] **Book #2: Cuentos de la selva (Quiroga, 1918)** — Wikisource fetch pipeline (config + tested extractor), 8 chapters, full gloss run, wired into books.ts, 90 tests green, build 53 pages`
2. In "File Map", add entries for the new files:
   - `astro/scripts/data/wikisource/selva.json` — book config
   - `astro/scripts/lib/wikisource-parse.mjs` + `astro/test/wikisource-parse.test.mjs` — tested Wikisource HTML extractor
   - `astro/scripts/fetch-wikisource.mjs` — Wikisource fetch CLI
   - `astro/src/data/books/selva/` — meta.json, 8 chapters, tokens/, glosses/, glosses.json
   - `astro/src/lib/books.ts` — selva wired in
   - `astro/test/data/books/selva.test.ts` — data shape + coverage tests
3. In "Next Steps", add a line: `1. (user-driven) Next book from idea/findings.md — pipeline now covers Gutenberg (fetch-book.mjs) AND Wikisource (fetch-wikisource.mjs)`
4. Update "Last updated:" to `2026-09-06`.

**Files:**

- `.pi/CONTEXT.md` — MODIFY — completion record

**Constraints:**

- DO: keep all existing content — only add/update the four spots above
- DO: match the file's existing checklist style (`- [x]`)
- DO NOT: touch `.pi/project-rules-memory.md` (that is write-tmp-memory's job)
- DO NOT: delete or rewrite CONTEXT.md wholesale

**Success:**

- [ ] Grep: `grep -n "Cuentos de la selva" .pi/CONTEXT.md` → ≥ 2 matches
- [ ] Grep: `grep -n "fetch-wikisource" .pi/CONTEXT.md` → ≥ 1 match
- [ ] Grep: `grep -n "2026-09-06" .pi/CONTEXT.md` → ≥ 1 match (Last updated line)

## Phase Verification

After all work packages are complete, run:

```bash
cd astro && npx vitest run
cd astro && npx astro check
cd astro && npm run build
```

- [ ] All 90 tests pass
- [ ] `astro check` exits 0
- [ ] Build succeeds with 53 pages
- [ ] `.pi/CONTEXT.md` records the book #2 completion
