# Phase 1: Frequency Pipeline

## Objective

Build the corpus-frequency category end to end: a tested pure helper module, a
CLI that reads all four books, and the committed generated
`src/data/words/frequency.json`. This phase introduces no curated content and
touches no shared registry file — after it, the app still builds unchanged.

## Prerequisites

- `cd astro && npm install` has been run (dependencies present).
- Node 22+ (`node --version`).
- The four books' `glosses.json` and `tokens/` directories exist and are
  committed (verify: `ls src/data/books/*/glosses.json` lists 4 files).

## Shared Context

See Global Context in `_index.md`.

Data shapes (read `astro/src/lib/types.ts` and one book's `glosses.json` first):

- `glosses.json`: `{ "<form>": { word, lemma, pos, ipa, ru, grammar, cefr,
  modern, false_friend, note }, ... }`.
- token file: `[{ t: string, w: string | null }, ...]` — `w` is the lowercased
  form, `null` for whitespace/punctuation/digits.
- `WordCategory`: `{ id, lang, title: { ru, en }, groups: [{ title, note?, items }] }`.

**Corpus-frequency algorithm (must be implemented exactly):**

1. **Merge glossaries.** Build one `form → gloss entry` map across all books.
   For each form, collect candidates from every book and vote on the pair
   `(lemma, pos)`, counting a candidate as a vote **only when `isNoisy` is
   false** (non-empty `ru` and `pos` not in `DEFAULT_EXCLUDE_POS`). If a form
   has at least one non-noisy candidate, pick the non-noisy pair with the most
   book votes; if it has none (e.g. a lone proper name), fall back to the noisy
   candidates. Tie-breaks: `lemma.localeCompare(other, "es")`, then
   `pos.localeCompare`, then book order. Store that candidate entry as the
   form's gloss. This fixes single-book (and noisy-label) mislabels: e.g.
   `para` is glossed `(parar, verb)` in andanzas but `(para, prep)` in the
   other three books → prep wins; and `el`, labelled `other` in three books but
   `art` in andanzas, merges to `art` because the `other` labels are not votes.
2. **Count tokens.** For every token with a non-null `w`, look up the merged
   form's `lemma` and increment that lemma's count. Skip forms absent from the
   merged map.
3. **Choose a display POS per lemma.** Candidate set: every **raw per-book
   gloss entry** (flattened across all books, in the caller's book order)
   whose `lemma` equals the counted lemma. Count a candidate as a vote only
   when `isNoisy(candidate)` is false — noisy labels (`name`/`other`, or an
   empty `ru`) are never votes. Pick the most-voted POS; break ties by
   alphabetically first POS (`localeCompare`). If a lemma has no non-noisy
   candidate at all, keep its most-voted noisy POS — step 5 will drop it from
   the category. Worked example (real data): the 17
   raw candidates for lemma `el` are `art` in andanzas (`el`, `la`, `las`,
   `los`) and in selva (`la`), and `other` in barraca / san-manuel / selva.
   Noisy `other` is ignored, so `art` (5 non-noisy votes) wins and `el` renders
   as «артикль». Counting `other` as a vote instead would give `other` 12 vs
   `art` 5 and wrongly drop the corpus's most frequent word.
4. **Pick a display entry per lemma.** Restrict to the same raw candidates
   (all books, caller order). Prefer, in order:
   a. an entry whose surface form equals the lemma (its `ru` describes the
      lemma itself — for lemma `el`, the `el` entry, never `la`'s);
   b. an entry whose `pos` equals the chosen display POS;
   c. an entry with non-empty `ru`;
   d. an entry with a non-empty `ipa`;
   e. earliest in book order, then alphabetically first form.
   Use the chosen entry's `ipa`/`ru`/`grammar`.
5. **Rank and group.** Drop lemmas whose display POS is in the exclude set
   (`["name", "other"]`). Sort by `count` descending, then `lemma` ascending
   (`localeCompare("es")`). Keep the first `limit` (200). Group by Russian POS
   label. Groups ordered by group total count descending, then label ascending.
   Items ordered count descending, then lemma ascending.

## Work Packages

### WP-1: Create the frequency helper module and its unit tests

**Context:**
Script pure logic lives in `astro/scripts/lib/` and is tested by
`astro/test/*.test.mjs`. Read `astro/scripts/lib/gloss-parse.mjs` and
`astro/test/tokenize.test.mjs` for the module/test style (named ESM exports,
`describe`/`it`/`expect` from `vitest`). The glossary merge algorithm is
described in "Shared Context" above. `WordEntry`/`WordCategory` are defined in
`astro/src/lib/types.ts` — the module returns plain objects matching that
shape (no TypeScript in `.mjs`).

**Task:**
Create `astro/scripts/lib/frequency.mjs` exporting exactly these symbols:

- `POS_RU` — object mapping gloss POS → Russian label:
  `{ verb: "глагол", noun: "сущ.", adj: "прил.", adv: "нареч.", pron: "мест.",
  prep: "предлог", conj: "союз", num: "числ.", interj: "межд.", art: "артикль" }`.
- `DEFAULT_EXCLUDE_POS` — `["name", "other"]`.
- `isNoisy(entry)` — true when `!entry` , `!entry.ru`, or `entry.pos` is in
  `DEFAULT_EXCLUDE_POS`.
- `mergeGlossaries(glossaries)` — `glossaries` is an array of plain objects
  (one per book, in the fixed order the caller passes). Returns
  `Map<form, entry>` implementing algorithm step 1. Vote only non-noisy
  candidates (`isNoisy` false); when a form has none, fall back to its noisy
  candidates. Tie-breaks: `lemma.localeCompare(other, "es")`, then
  `pos.localeCompare`, then book order.
- `countLemmaFrequency(books)` — `books` is
  `[{ id, glosses, tokens }]`. `tokens` entries may be either a plain string
  (a surface form) or a parsed token object `{ t, w }`; normalise each element
  with `const w = typeof el === "string" ? el : el.w` and skip a `w` that is
  null/empty. Uses `mergeGlossaries(books.map(b => b.glosses))` for step 2,
  then implements steps 3–4 over the raw per-book entries. Returns
  `Map<lemma, { lemma, count, pos, ref }>` where `pos` is the chosen **gloss**
  POS (not the Russian label) and `ref` is the chosen display entry.
- `buildFrequencyCategory(freq, options)` — `options` is
  `{ limit = 200, excludePos = DEFAULT_EXCLUDE_POS }`. Implements step 5 and
  returns a `WordCategory`:
  - `id: "frequency"`, `lang: "es"`,
    `title: { ru: "Частотные слова из книг", en: "Frequent words from the books" }`
  - each entry:
    `{ es: lemma, ipa: <normalised ref.ipa or null>, pos: POS_RU[pos] ?? pos,
    ru: ref.ru ?? null, example: null, grammar: ref.grammar ?? null,
    note: "вхождений в корпусе: " + count.toLocaleString("ru-RU") }`.
    IPA normalisation (committed gloss `ipa` is inconsistent: `"el"`,
    `ˈpaɾa`, `[ˈpaɾa]`, `/la/`): strip surrounding `[` `]`, and wrap a
    non-empty value that has no `/` delimiters as `/<value>/`; an empty or
    absent value becomes `null`.

Then create `astro/test/frequency.test.mjs` covering:

1. `mergeGlossaries` majority vote — input `[{ el: {lemma:"el",pos:"art",ru:"арт"} },
   { el: {lemma:"el",pos:"other",ru:null} },
   { el: {lemma:"el",pos:"other",ru:null} }]` → merged `el` is the `art` entry.
2. `mergeGlossaries` `para` case — book1 `{para:{lemma:"parar",pos:"verb",ru:"ост."}}`,
   books 2–4 `{para:{lemma:"para",pos:"prep",ru:"для"}}` → merged `para` is the `prep` entry.
3. `countLemmaFrequency` — books (book A uses plain-string tokens, book B uses
   parsed `{ t, w }` token objects — both shapes must normalise):
   - A: `tokens` `["el","el","la","de","es"]`, glosses
     `{ el:{lemma:"el",pos:"art",ru:"арт"}, la:{lemma:"el",pos:"art",ru:"арт"},
        de:{lemma:"de",pos:"prep",ru:"из"}, es:{lemma:"ser",pos:"verb",ru:"есть"} }`.
   - B: `tokens` `[{t:"el",w:"el"},{t:"la",w:"la"},{t:"los",w:"los"},
     {t:"las",w:"las"},{t:"de",w:"de"},{t:"de",w:"de"}]`, glosses
     `{ el:{lemma:"el",pos:"other",ru:null}, la:{lemma:"el",pos:"other",ru:null},
        los:{lemma:"el",pos:"other",ru:null}, las:{lemma:"el",pos:"other",ru:null},
        de:{lemma:"de",pos:"prep",ru:"из"} }`.
   → `el` count **7** (A: `el`×2 + `la` = 3; B: `el` + `la` + `los` + `las` = 4;
   all lemma `el`), `de` 3, `ser` 1. `el` POS is `art`: noisy `other` is not a
   vote, so the 2 non-noisy `art` candidates win over 4 noisy ones.
4. `buildFrequencyCategory` — with the step-3 frequency map and `{ limit: 2 }`
   → `id "frequency"`, 2 entries total, group order `["артикль","предлог"]`
   (7 > 3), first group items `["el"]`, second `["de"]`, entry `pos` values are
   the Russian labels, and `note` matches `/вхождений в корпусе: \d/`.
5. `buildFrequencyCategory` excludes noisy POS — a lemma whose only candidate
   POS is `other` is absent from `groups`.

**Files:**
- `astro/scripts/lib/frequency.mjs` — CREATE — merge/count/build helpers
- `astro/test/frequency.test.mjs` — CREATE — vitest unit tests above

**Constraints:**
- DO: Node built-ins only; no imports besides `vitest` in the test.
- DO: make every tie-break deterministic (explicit `localeCompare` comparisons).
- DO: keep all functions pure — no filesystem access in this module.
- DO NOT: read files, parse JSON, or write output in this module.
- DO NOT: add dependencies.
- DO NOT: use `Object.entries` iteration order as a tie-break — sort explicitly.

**Success:**
- [ ] File exists: `test -f scripts/lib/frequency.mjs` → exit 0
- [ ] Exports present: `grep -c "^export " scripts/lib/frequency.mjs` → ≥ 5
- [ ] Tests pass: `npx vitest run test/frequency.test.mjs` → exit 0
- [ ] Test count: `grep -c "it(" test/frequency.test.mjs` → ≥ 5
- [ ] `npx astro check` → exit 0

### WP-2: Create the frequency CLI and generate the category JSON

**Context:**
`astro/scripts/lib/frequency.mjs` now exports `countLemmaFrequency` and
`buildFrequencyCategory`. The CLI wrapper pattern (ROOT computation, `readJson`,
`writeFileSync`) is in `astro/scripts/gloss.mjs` lines 1–30. Books live at
`src/data/books/<id>/`; iterate directory names in `readdirSync(...).sort()`
order so the merge votes are deterministic. Token files are every `.json` file
in `src/data/books/<id>/tokens/`, also read in sorted order.

**Task:**
Create `astro/scripts/build-frequency-words.mjs` that:

1. Reads every book directory under `src/data/books/` that contains both
   `glosses.json` and a `tokens/` directory.
2. For each book, parses `glosses.json` and concatenates all parsed token
   arrays (sorted filenames).
3. Calls `countLemmaFrequency(books)` then `buildFrequencyCategory(freq)`
   (default limit 200).
4. Writes `src/data/words/frequency.json` as
   `JSON.stringify(category, null, 2) + "\n"`.
5. Prints a one-line summary to stdout:
   `frequency: <books> books, <lemmas> lemmas, <groups> groups, <entries> entries`.

Then run it: `node scripts/build-frequency-words.mjs`.

**Files:**
- `astro/scripts/build-frequency-words.mjs` — CREATE — CLI wrapper
- `astro/src/data/words/frequency.json` — CREATE — generated output, committed

**Constraints:**
- DO: derive `ROOT` with `dirname(fileURLToPath(import.meta.url))` + `".."`.
- DO: use `readFileSync`/`writeFileSync` with `"utf8"` and `JSON.parse`/`JSON.stringify`.
- DO: take no CLI arguments — limit is fixed at 200.
- DO: overwrite `frequency.json` on every run (regeneration is the point).
- DO NOT: add dependencies, config files, or an `--out`/`--limit` flag.
- DO NOT: modify any book data or other `.json` under `src/data/words/`.

**Success:**
- [ ] File exists: `test -f scripts/build-frequency-words.mjs` → exit 0
- [ ] Command: `node scripts/build-frequency-words.mjs` → prints
      `... groups, 200 entries` and exit 0
- [ ] Output valid JSON with 200 entries:
      `node -e "const d=require('./src/data/words/frequency.json');console.log(d.id, d.lang, d.groups.reduce((n,g)=>n+g.items.length,0))"`
      → `frequency es 200`
- [ ] No noisy POS in output:
      `node -e "const d=require('./src/data/words/frequency.json');const b=d.groups.flatMap(g=>g.items).filter(i=>['name','other','прочее'].includes(i.pos));console.log(b.length)"`
      → `0`
- [ ] `grep -c "имя\|прочее" src/data/words/frequency.json` → `0`

### WP-3: Create the frequency category data test

**Context:**
The generated `astro/src/data/words/frequency.json` has 200 entries grouped by
Russian POS label. Import the JSON directly with a relative path
(`../../../src/data/words/frequency.json`); do **not** copy
`test/data/words/pronouns.test.ts`, which reads through `src/lib/words` and
would fail before Phase 4 wires the registry. The registry is NOT wired yet
(Phase 4 does that), so this test must not import `src/lib/words`.

**Task:**
Create `astro/test/data/words/frequency.test.ts` asserting:

1. Metadata: `id === "frequency"`, `lang === "es"`, `title.ru === "Частотные
   слова из книг"`, `title.en === "Frequent words from the books"`.
2. Total entries across all groups `=== 200`.
3. At least 6 groups; every group has a non-empty title and ≥ 1 item.
4. Groups are non-increasing by total group frequency: for every consecutive
   pair, `group[i]` total ≥ `group[i+1]` total, where a group's total is the
   sum of its entries' frequencies parsed from `note`
   (`/вхождений в корпусе:\s*([\d\u00a0\s]+)/`, strip non-digits).
5. Every entry has non-empty `es`, `pos`, `ru`; `example === null`; `note`
   matches `/^вхождений в корпусе: \d[\d\u00a0\s]*$/`.
6. `es` values are unique **globally** (not just per group).
7. No entry `pos` is `"имя"`, `"прочее"`, `"name"`, or `"other"`.

**Files:**
- `astro/test/data/words/frequency.test.ts` — CREATE — shape/invariant tests

**Constraints:**
- DO: import the JSON directly: `import frequency from "../../../src/data/words/frequency.json"`.
- DO: import `{ describe, it, expect }` from `vitest`.
- DO: type the imported JSON as `WordCategory` via
  `frequency as unknown as WordCategory` if TypeScript complains (import the
  type from `../../../src/lib/types`).
- DO NOT: import from `src/lib/words` — the registry is wired in Phase 4.
- DO NOT: assert exact group titles — groups are derived from corpus POS and may
  shift when book data changes; assert ordering and invariants instead.
- DO NOT: hardcode a specific lemma in the test.

**Success:**
- [ ] File exists: `test -f test/data/words/frequency.test.ts` → exit 0
- [ ] Tests pass: `npx vitest run test/data/words/frequency.test.ts` → exit 0
- [ ] `npx astro check` → exit 0
- [ ] Regeneration is idempotent: `mkdir -p .tmp && cp src/data/words/frequency.json .tmp/frequency.prev.json && node scripts/build-frequency-words.mjs && cmp -s .tmp/frequency.prev.json src/data/words/frequency.json` → exit 0 (byte-identical; `git status` is unusable here because the new file is untracked and the executor must not commit)

## Phase Verification

After WP-1 → WP-3 are complete, run from `astro/`:

```bash
node scripts/build-frequency-words.mjs
npx vitest run test/frequency.test.mjs test/data/words/frequency.test.ts
npx astro check
npm run build
```

- [ ] Script regenerates 200 entries and exits 0
- [ ] Both test files pass (vitest exits 0)
- [ ] No type errors (`astro check` exits 0)
- [ ] Build succeeds (`npm run build` exits 0)
- [ ] Regeneration is byte-identical (deterministic output):
      `mkdir -p .tmp && cp src/data/words/frequency.json .tmp/frequency.prev.json && node scripts/build-frequency-words.mjs && cmp -s .tmp/frequency.prev.json src/data/words/frequency.json`
      → exit 0
- [ ] `/words/frequency/` is NOT yet in `dist/` (wiring happens in Phase 4):
      `test ! -d dist/words/frequency` → exit 0
