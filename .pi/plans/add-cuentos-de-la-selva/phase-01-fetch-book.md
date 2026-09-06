# Phase 1: Fetch Book from Wikisource

## Objective

Create the Wikisource fetch tooling and produce `astro/src/data/books/selva/`
with `meta.json` + 8 chapter text files. The extraction logic is a pure, tested
helper; the CLI script does the network work. This phase ends with the book
text on disk, verified.

## Prerequisites

- Node 22+ (already installed)
- Internet access to `es.wikisource.org` (verified working 2026-09-06)

## Shared Context

The MediaWiki API endpoint is:
`https://es.wikisource.org/w/api.php?action=parse&page={encodeURIComponent(title)}&prop=text&format=json&formatversion=2`

The response JSON has `parse.text` = rendered HTML string. Verified structure
of that HTML (2026-09-06, pages "La tortuga gigante" and "Historia de dos
cachorros de coatí y de dos cachorros de hombre"):

- Header nav div: `<div class="noprint ws-noexport" id="headertemplate">...`
- Metadata div: `<div id="ws-data" class="ws-noexport" style="display:none">...`
  — IMPORTANT: it sits in the page HEADER, BEFORE the title heading (not a
  footer). Do not use it to anchor the body end.
- Title heading: `<div class="ws-div ws-h3-medio"> LA TORTUGA GIGANTE</div>` (inside an `<h3>`)
- Body: `<p>...</p>` elements — the story body is the LAST block of paragraphs
  in the document (after it come only a closing `</div>` and a NewPP comment).
  The first body paragraph starts with a `<style>` block (dropinitial CSS,
  `data-mw-deduplicate="TemplateStyles:r1647991"`) followed by the drop-cap
  image: `<img alt="H" src="//upload.wikimedia.org/...">` — the letter is in
  `alt`. Paragraphs may contain empty `<span class="pagenum" id="14" title="..."></span>`
  markers and `&#32;` (space) entities.
- The story body is everything between the first `<p>` after the
  `ws-h3-medio` heading and the last `</p>` in the whole document.

The existing `astro/scripts/fetch-book.mjs` shows the project's script style:
`__dirname`-based ROOT, `parseArgs`, `slugify`, `mkdirSync` + `writeFileSync`,
per-chapter word-count logging. Read it before writing the new script.

## Work Packages

### WP-1: Create the selva book config

**Context:**
The project keeps script data in `astro/scripts/data/` (see
`astro/scripts/data/phrases.json`). The new fetch script will read a small
JSON config describing the book. The 8 story page titles on Wikisource es
(verified in the Índice of the 1918 edition, order matters) are listed in
Global Context of `_index.md`.

**Task:**
Create `astro/scripts/data/wikisource/selva.json` with EXACTLY this content:

```json
{
  "id": "selva",
  "lang": "es",
  "title": "Cuentos de la selva",
  "author": "Horacio Quiroga",
  "source": "Wikisource es (1918 ed.)",
  "pages": [
    "La tortuga gigante",
    "Las medias de los flamencos",
    "El loro pelado",
    "La guerra de los yacarés",
    "La gama ciega",
    "Historia de dos cachorros de coatí y de dos cachorros de hombre",
    "El paso del Yabebirí",
    "La abeja haragana"
  ]
}
```

**Files:**

- `astro/scripts/data/wikisource/selva.json` — CREATE — book config

**Constraints:**

- DO: keep the exact field names (`id`, `lang`, `title`, `author`, `source`, `pages`)
- DO: keep the page titles verbatim — they are the Wikisource page names
- DO NOT: add extra fields (no description, no year — YAGNI)
- DO NOT: reorder the pages — Índice order is load-bearing

**Success:**

- [ ] File exists: `test -f astro/scripts/data/wikisource/selva.json` → exit 0
- [ ] Valid JSON with 8 pages:
      `node -e "const c=require('./astro/scripts/data/wikisource/selva.json'); console.log(c.id, c.pages.length)"` → prints `selva 8`
- [ ] Grep: `grep -c '"pages"' astro/scripts/data/wikisource/selva.json` → 1

### WP-2: Create the tested HTML extraction helper

**Context:**
The project's pattern for pure parsing logic: `astro/scripts/lib/gloss-parse.mjs`
exports pure functions, tested by `astro/test/gloss-parse.test.mjs` (plain
`.mjs`, vitest, `describe`/`it`/`expect` from "vitest"). Read both files first.
The new helper extracts the story body from a Wikisource rendered-HTML string.

**Task:**
Create `astro/scripts/lib/wikisource-parse.mjs` exporting exactly one
function, `extractStoryText(html, pageTitle)`, implementing this algorithm:

1. `const h3 = html.indexOf("ws-h3-medio")` — if `-1`, throw
   `new Error("no ws-h3-medio heading in " + pageTitle)`.
2. `const start = html.indexOf("<p>", h3)` — if `-1`, throw
   `new Error("no <p> after heading in " + pageTitle)`.
3. `const end = html.lastIndexOf("</p>") + 4` — the last `</p>` in the WHOLE
   document. The story body is the final paragraph block; `id="ws-data"` sits
   in the page header BEFORE the heading, so it cannot anchor the end.
4. If `end <= start`, throw `new Error("no story body in " + pageTitle)`.
5. `let body = html.slice(start, end)`.
6. Drop caps: `body = body.replace(/<img[^>]*alt="([^"]*)"[^>]*>/g, "$1")`.
7. Strip style/script blocks (the first body `<p>` starts with a `<style>`
   block whose CSS would otherwise leak into the text):
   `body = body.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")` and
   `body = body.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")`.
8. Paragraph breaks: `body = body.replace(/<\/p>/gi, "\n\n")` and
   `body = body.replace(/<br\s*\/?>/gi, "\n")`.
9. Strip all remaining tags: `body = body.replace(/<[^>]+>/g, "")`.
10. Decode numeric entities: `body = body.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))`.
11. Decode named entities: `&nbsp;`→space, `&amp;`→`&`, `&lt;`→`<`, `&gt;`→`>`,
    `&quot;`→`"`, `&#39;`→`'`.
12. Collapse horizontal whitespace: `body = body.replace(/[ \t]+/g, " ")`.
13. Trim every line (removes spaces left adjacent to paragraph breaks,
    e.g. `&#32;` before `</p>`):
    `body = body.split("\n").map((l) => l.trim()).join("\n")`.
14. Collapse 3+ newlines to 2: `body = body.replace(/\n{3,}/g, "\n\n")`.
15. Trim leading newlines, then `.trim()`, then ensure the text ends with
    exactly one `\n` (append if missing).
16. Return the string.

Then create `astro/test/wikisource-parse.test.mjs` with a fixture and tests:

```js
import { describe, it, expect } from "vitest";
import { extractStoryText } from "../scripts/lib/wikisource-parse.mjs";

const FIXTURE = `<div class="prp-pages-output" lang="es" dir="ltr">
<div class="noprint ws-noexport" id="headertemplate"><div class="wsbox-main">Cuentos de la selva para los niños (1918) de Horacio Quiroga</div></div>
<div id="ws-data" class="ws-noexport" style="display:none"><span class="ws-title">La tortuga gigante</span><span class="ws-year">1918</span><span class="ws-author">Horacio Quiroga</span></div>
<h3><div class="ws-div ws-h3-medio"> LA TORTUGA GIGANTE</div></h3>
<p><style data-mw-deduplicate="TemplateStyles:r1647991">.mw-parser-output .dropinitial{float:left}</style><span class="dropinitial"><img alt="H" src="//upload.wikimedia.org/thumb.jpg"/></span>abía una vez un hombre que vivía en Buenos Aires.&#32;</p>
<p>Y como&#32;<span><span class="pagenum" id="14" title="Página:...pdf/16"></span></span>tenía mucha puntería, cazaba bichos del monte.</p>
<p>El cazador se curó en seguida. &nbsp; Fin.</p>
</div>`;

describe("extractStoryText", () => {
  it("extracts the body, dropping header nav, metadata div and title heading", () => {
    const out = extractStoryText(FIXTURE, "La tortuga gigante");
    expect(out).not.toContain("headertemplate");
    expect(out).not.toContain("ws-data");
    expect(out).not.toContain("ws-title");
    expect(out).not.toContain("LA TORTUGA GIGANTE");
  });

  it("restores the drop-cap letter from the img alt", () => {
    const out = extractStoryText(FIXTURE, "La tortuga gigante");
    expect(out.startsWith("Había una vez un hombre que vivía en Buenos Aires.")).toBe(true);
  });

  it("separates paragraphs with blank lines and drops pagenum spans", () => {
    const out = extractStoryText(FIXTURE, "La tortuga gigante");
    expect(out).toContain("Buenos Aires.\n\nY como tenía mucha puntería, cazaba bichos del monte.");
    expect(out).not.toContain("pagenum");
  });

  it("decodes entities and collapses stray spaces", () => {
    const out = extractStoryText(FIXTURE, "La tortuga gigante");
    expect(out).toContain("en seguida. Fin.");
    expect(out).not.toContain("&#");
    expect(out).not.toContain("&nbsp;");
  });

  it("strips the dropinitial style block and keeps the body non-empty", () => {
    const out = extractStoryText(FIXTURE, "La tortuga gigante");
    expect(out).not.toContain("mw-parser-output");
    expect(out).not.toContain("dropinitial");
    expect(out.trim().length).toBeGreaterThan(0);
  });

  it("throws with the page title when the heading is missing", () => {
    expect(() => extractStoryText("<p>solo</p>", "Página rara")).toThrow(/Página rara/);
  });
});
```

**Files:**

- `astro/scripts/lib/wikisource-parse.mjs` — CREATE — pure extraction helper
- `astro/test/wikisource-parse.test.mjs` — CREATE — 6 tests with the fixture above

**Constraints:**

- DO: copy the fixture and tests exactly as given
- DO: follow the style of `astro/scripts/lib/gloss-parse.mjs` (plain ESM, no types, no deps)
- DO NOT: add a second export — one function only
- DO NOT: handle anything beyond the algorithm above (no URL parsing, no fetching)

**Success:**

- [ ] File exists: `test -f astro/scripts/lib/wikisource-parse.mjs` → exit 0
- [ ] Exports the function: `grep -n "export function extractStoryText" astro/scripts/lib/wikisource-parse.mjs` → 1 match
- [ ] Tests pass: `cd astro && npx vitest run test/wikisource-parse.test.mjs` → exit 0, 6 passed

### WP-3: Create the Wikisource fetch CLI script

**Context:**
Read `astro/scripts/fetch-book.mjs` first — it shows the project's CLI style:
`parseArgs` with defaults, `__dirname`-based `ROOT = join(__dirname, "..")`
(= `astro/`), `slugify` (copy it verbatim), `mkdirSync(..., { recursive: true })`,
`writeFileSync` with `JSON.stringify(meta, null, 2) + "\n"`, per-chapter
word-count logging. The gloss pipeline's retry pattern is in
`astro/scripts/gloss.mjs` (`glossBatch`: 3 attempts, 5s backoff).

**Task:**
Create `astro/scripts/fetch-wikisource.mjs` — a CLI that:

1. `parseArgs` with defaults: `--config` → `scripts/data/wikisource/selva.json`,
   `--output` → `src/data/books/selva` (both resolved against `ROOT`).
2. Reads the config JSON (throw a clear error if unreadable).
3. For each page title in `config.pages`, in order:
   - Fetch `https://es.wikisource.org/w/api.php?action=parse&page=${encodeURIComponent(title)}&prop=text&format=json&formatversion=2`
     with headers `{ "user-agent": "learn-spanish-app/1.0 (book fetch script)" }`.
   - Retry up to 3 attempts with 5s backoff on network errors (mirror
     `glossBatch` in `astro/scripts/gloss.mjs`).
   - If `res.ok` is false, throw `new Error("HTTP " + res.status + " for " + title)`.
   - Parse JSON; if `data.parse?.text` is missing, throw
     `new Error("no parse.text for " + title)`.
   - `const text = extractStoryText(data.parse.text, title)` (import from
     `./lib/wikisource-parse.mjs`).
   - Wait 300ms between pages (polite to Wikimedia).
4. Build `meta.json`:
   `{ id, lang, title, author, source, chapters: pages.map(p => ({ id: slugify(p), title: p })) }`
   (id/lang/title/author/source from the config).
5. `mkdirSync(join(output, "chapters"), { recursive: true })`; write
   `meta.json` and each `chapters/{slug}.txt` (text as returned, no title line).
6. Log per-chapter word counts (`text.split(/\s+/).filter(Boolean).length`),
   then `Sections: N` and `Total words: N` (same format as fetch-book.mjs).

**Files:**

- `astro/scripts/fetch-wikisource.mjs` — CREATE — CLI fetch script

**Constraints:**

- DO: copy `slugify` verbatim from `astro/scripts/fetch-book.mjs`
- DO: import `extractStoryText` from `./lib/wikisource-parse.mjs`
- DO: use `fetch` (Node 22 global) — no new dependencies
- DO: wrap `main()` in `.catch((e) => { console.error(e); process.exit(1); })`
- DO NOT: hardcode the 8 titles in the script — they come from the config
- DO NOT: write anything outside `astro/src/data/books/selva/` and the config path
- DO NOT: add a `--help` flag or other CLI niceties

**Success:**

- [ ] File exists: `test -f astro/scripts/fetch-wikisource.mjs` → exit 0
- [ ] Imports the helper: `grep -n "extractStoryText" astro/scripts/fetch-wikisource.mjs` → ≥ 2 matches (import + call)
- [ ] Reads the config: `grep -n "selva.json" astro/scripts/fetch-wikisource.mjs` → ≥ 1 match
- [ ] Syntax check: `node --check astro/scripts/fetch-wikisource.mjs` → exit 0

### WP-4: Run the fetch and verify the book data

**Context:**
WP-1..WP-3 are done. The script defaults point at the selva config and output
dir, so a bare run from the repo root works.

**Task:**
Run `node astro/scripts/fetch-wikisource.mjs` from the repo root. Then verify
the output.

**Files:**

- `astro/src/data/books/selva/meta.json` — CREATE (by the script)
- `astro/src/data/books/selva/chapters/*.txt` — CREATE (8 files, by the script)

**Constraints:**

- DO: run from the repo root — do not `cd` into `astro/`
- DO: if a page fails after retries, report the exact error and STOP — do not
  hand-edit chapter files
- DO NOT: modify the chapter text files by hand

**Success:**

- [ ] Command: `node astro/scripts/fetch-wikisource.mjs` → exit 0, logs `Sections: 8` and a total word count
- [ ] `test -f astro/src/data/books/selva/meta.json` → exit 0
- [ ] 8 chapter files: `ls astro/src/data/books/selva/chapters/ | wc -l` → 8
- [ ] Chapter ids match the expected slugs (from `_index.md` Conventions) and
      every chapter is 300–8000 words: write `.tmp/verify-selva.mjs` (scratch,
      gitignored) with EXACTLY this content, then run `node .tmp/verify-selva.mjs`
      → exit 0:

      ```js
      import { readFileSync } from "node:fs";

      const EXPECTED = [
        "la-tortuga-gigante",
        "las-medias-de-los-flamencos",
        "el-loro-pelado",
        "la-guerra-de-los-yacares",
        "la-gama-ciega",
        "historia-de-dos-cachorros-de-coati-y-de-dos-cachorros-de-hombre",
        "el-paso-del-yabebiri",
        "la-abeja-haragana",
      ];
      const meta = JSON.parse(
        readFileSync("astro/src/data/books/selva/meta.json", "utf8"),
      );
      const ids = meta.chapters.map((c) => c.id);
      if (JSON.stringify(ids) !== JSON.stringify(EXPECTED)) {
        console.error("slug mismatch:", ids);
        process.exit(1);
      }
      for (const c of meta.chapters) {
        const text = readFileSync(
          `astro/src/data/books/selva/chapters/${c.id}.txt`,
          "utf8",
        );
        const words = text.split(/\s+/).filter(Boolean).length;
        console.log(c.id, words);
        if (words < 300 || words > 8000) process.exit(1);
      }
      console.log("OK: 8 chapters, slugs match, word counts in range");
      ```
- [ ] Drop cap restored: `head -c 40 astro/src/data/books/selva/chapters/la-tortuga-gigante.txt` → starts with `Había una vez`
- [ ] No HTML artifacts in any chapter:
      `grep -l "&#\|<p>\|pagenum\|ws-\|headertemplate" astro/src/data/books/selva/chapters/*.txt` → no output (exit 1)
- [ ] Old orthography preserved (spot check): `grep -c "fué" astro/src/data/books/selva/chapters/la-tortuga-gigante.txt` → ≥ 1

## Phase Verification

After all work packages are complete, run:

```bash
cd astro && npx vitest run test/wikisource-parse.test.mjs
```

- [ ] All 6 helper tests pass
- [ ] `astro/src/data/books/selva/` contains meta.json + 8 non-empty chapter files
- [ ] No HTML/entity artifacts in any chapter file
