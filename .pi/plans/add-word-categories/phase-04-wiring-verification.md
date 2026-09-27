# Phase 4: Wiring & Verification

## Objective

Register the seven new categories in `astro/src/lib/words.ts` in a fixed display
order, add a cross-category registry test, and verify the full site build: 8
`/words/<id>/` routes, sitemap entries, JSON-LD, and clean type/tests.

## Prerequisites

- Phases 1–3 complete: all 7 new `src/data/words/*.json` files exist and their
  data tests pass.
- Read before starting: `astro/src/lib/words.ts`,
  `astro/test/data/words/categories.test.ts` (will be created),
  `astro/src/pages/words/[category]/index.astro` (generic, no change).

## Shared Context

See Global Context in `_index.md`. `src/lib/words.ts` is the single shared file
every new category must be registered in. The `/words/[category]/` page,
`Chooser`, `WordLesson`, `seo.ts` and `jsonld.ts` are all generic and must NOT
be touched.

## Work Packages

### WP-10: Register all seven categories in the words registry

**Context:**
`astro/src/lib/words.ts` currently imports only `pronouns.json` and exports
`languages` and `categories: WordCategory[] = [pronouns]`, plus `getCategory`.
`WordLesson.test.tsx` renders `categories[0]` and asserts it is «Местоимения»
with 9 groups / 69 items — so **`pronouns` must remain the first element**.
`Chooser` renders `categories` filtered by `lang` in array order; the array
order below is the display order on the home page.

**Task:**
Modify `astro/src/lib/words.ts` so it imports all eight data files and exports
this exact `categories` array order:

`pronouns, core-verbs, prepositions, conjunctions, adverbs, numbers,
interjections, frequency`

The final file must match this (modulo the cast exception in the constraints
below):

```ts
import pronouns from "../data/words/pronouns.json";
import coreVerbs from "../data/words/core-verbs.json";
import prepositions from "../data/words/prepositions.json";
import conjunctions from "../data/words/conjunctions.json";
import adverbs from "../data/words/adverbs.json";
import numbers from "../data/words/numbers.json";
import interjections from "../data/words/interjections.json";
import frequency from "../data/words/frequency.json";
import type { WordCategory } from "./types";

export const languages: { id: string; name: string }[] = [
  { id: "es", name: "Español" },
];

export const categories: WordCategory[] = [
  pronouns,
  coreVerbs,
  prepositions,
  conjunctions,
  adverbs,
  numbers,
  interjections,
  frequency,
];

export function getCategory(id: string): WordCategory | undefined {
  return categories.find((c) => c.id === id);
}
```

**Files:**
- `astro/src/lib/words.ts` — MODIFY — imports + `categories` array only;
  `languages` and `getCategory` stay byte-identical.

**Constraints:**
- DO: keep `pronouns` as `categories[0]`.
- DO: keep the import order shown above and import each JSON only once.
- DO: leave `languages` and `getCategory` unchanged.
- DO NOT: add a cast (`as WordCategory`) unless `astro check` reports a JSON
  literal-type error; if it does, cast only the offending import and note it.
- DO NOT: reorder or re-export anything else, or add helper functions.
- DO NOT: modify the JSON data files in this WP.

**Success:**
- [ ] `grep -c "src/data\|data/words" src/lib/words.ts` → 8
- [ ] `grep -n "categories: WordCategory\[\]" -A 9 src/lib/words.ts` shows the
      8 entries in the stated order
- [ ] `npx astro check` → exit 0
- [ ] `npx vitest run test/components/WordLesson.test.tsx test/components/Chooser.test.tsx` → exit 0
- [ ] `npm run build` → exit 0 and creates all 8 routes:
      `node -e "const fs=require('fs'),p=require('path');for(const id of ['pronouns','core-verbs','prepositions','conjunctions','adverbs','numbers','interjections','frequency'])if(!fs.existsSync(p.join('dist','words',id,'index.html')))throw new Error('missing '+id);console.log('8 routes ok')"`
      → `8 routes ok`  (use `path.join` — a `'dist/words/'+id+'/index.html'`
      string trips this machine's pi path guard: `Access to D:\index.html is
      blocked`)
- [ ] `ls dist/words | wc -l` → `8`

### WP-11: Create the cross-category registry test

**Context:**
The registry is now wired (WP-10). This test guards invariants that must hold
for every category and would catch a broken import, a wrong order, or a
malformed group across all eight files at once. It complements the per-category
data tests (which import JSON directly) by asserting the registry itself.

**Task:**
Create `astro/test/data/words/categories.test.ts` importing
`{ categories }` from `"../../../src/lib/words"` and asserting:

1. `categories.map(c => c.id)` equals exactly
   `["pronouns","core-verbs","prepositions","conjunctions","adverbs","numbers","interjections","frequency"]`.
2. `categories[0].id === "pronouns"` (WordLesson/Chooser depend on it).
3. Category ids are unique; `title.ru` values are unique; every `title.ru` and
   `title.en` is non-empty after `trim()`.
4. Every category has `lang === "es"`.
5. Every category has ≥ 1 group; every group title non-empty after `trim()`;
   every group has ≥ 1 item.
6. Every entry across all categories has non-empty `es`, `pos`, `ru`, and each
   category has ≥ 1 entry.
7. `es` is unique within every group.
8. Total entries across all categories is between 700 and 900.

**Files:**
- `astro/test/data/words/categories.test.ts` — CREATE — registry invariants

**Constraints:**
- DO: import `{ describe, it, expect }` from `vitest` and `categories` from
  `../../../src/lib/words`.
- DO: keep assertions generic over `categories` — do not hardcode per-category
  group titles here (those live in the per-category tests).
- DO: state the exact expected id order (item 1) — it is a deliberate contract.
- DO NOT: import any JSON file directly in this test.
- DO NOT: assert exact group counts or exact entry counts per category.
- DO NOT: modify source files in this WP.

**Success:**
- [ ] `test -f test/data/words/categories.test.ts` → exit 0
- [ ] `npx vitest run test/data/words/categories.test.ts` → exit 0
- [ ] `npx astro check` → exit 0

## Phase Verification

After WP-10 → WP-11 are complete, run from `astro/`:

```bash
npx vitest run
npx astro check
npm run build
```

Then verify the generated output:

```bash
ls dist/words | wc -l
node -e "const fs=require('fs'),p=require('path');const ids=['pronouns','core-verbs','prepositions','conjunctions','adverbs','numbers','interjections','frequency'];for(const id of ids){const h=fs.readFileSync(p.join('dist','words',id,'index.html'),'utf8');if(!h.includes('LearningResource'))throw new Error('no JSON-LD in '+id);}console.log('jsonld ok')"
grep -o "/words/[a-z-]*/" dist/sitemap-0.xml | sort -u
```

- [ ] Full suite passes (`npx vitest run` exits 0, 100% of files)
- [ ] No type errors (`astro check` exits 0)
- [ ] Build succeeds (`npm run build` exits 0)
- [ ] `ls dist/words | wc -l` → `8`
- [ ] JSON-LD check prints `jsonld ok`
- [ ] `grep -o` above lists exactly the 8 `/words/<id>/` paths
- [ ] Home page links all 8 categories: 
      `grep -o 'href="/words/[a-z-]*/"' dist/index.html | sort -u | wc -l` → `8`
- [ ] No audit regression expected; the user runs Lighthouse separately
      (audits are a post-build, user-driven stage — not this plan)
