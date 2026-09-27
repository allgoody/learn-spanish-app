# Context — learn-spanish-app

**Project:** Spanish learning web app (static, mobile-first)
**Rules:** See `.pi/project-rules-memory.md` for tech stack, architecture, and design constraints.
**Routing decision:** See `idea/routing.md` — flat URLs, content language as data, translation language tied to app setting. Read before touching URL structure.

Last updated: 2026-09-27

## Current Task

**Plan `add-word-categories` implemented (2026-09-27).** The `/words/` section grew from 1 category (pronouns, 69) to 8: four curated function-word/grammar categories, plus a corpus-frequency category generated from all four books' committed glosses. All 4 phases / 11 WPs complete; full suite 153 tests green, build 78 pages. Nothing committed, nothing deployed.

## Completed This Session

- [x] **Phase 1 — frequency pipeline** — `scripts/lib/frequency.mjs` (mergeGlossaries/countLemmaFrequency/buildFrequencyCategory), `scripts/build-frequency-words.mjs` CLI, `test/frequency.test.mjs`; generated `src/data/words/frequency.json` (200 entries, 9 groups)
- [x] **Phase 2 — curated categories** — `prepositions.json` (97), `conjunctions.json` (85), `interjections.json` (85), `core-verbs.json` (48) + direct-import data tests
- [x] **Phase 3 — curated categories** — `adverbs.json` (109), `numbers.json` (82) + tests
- [x] **Phase 4 — wiring** — `lib/words.ts` imports all 8 JSONs in the contracted order (`pronouns` stays `[0]`); `test/data/words/categories.test.ts` registry invariants (ids/order/uniqueness/700–900 total)
- [x] **Verified**: `npx vitest run` 24 files / 153 tests · `astro check` 0 errors · build 78 pages · `dist/words` 8 routes · JSON-LD (LearningResource) in all 8 · sitemap exactly 8 `/words/<id>/` · home links 8
- [x] **Forbidden files confirmed untouched**: `pronouns.json`, `WordLesson.tsx`, `Chooser.tsx`, `pages/words/[category]/index.astro`, `seo.ts`, `jsonld.ts`, all book data

## In Progress

- (none)

## Blocked / Needs Decision

- [?] **`frequency.json` Castilian `/θ/`** — 11 generated entries inherit `/θ/` from committed book glosses (`decir /deˈθiɾ/`, `hacer /aˈθeɾ/`, `vez /beθ/`, `ciudad`, `cielo`, `cabeza`, `luz`, `entonces`, `parecer`, `conocer`, `empezar`), which conflicts with the project's locked seseo rule. The plan's IPA-normalisation spec was exhaustive and said nothing about seseo, so it was implemented exactly as written rather than silently extended. Fix = map `θ→s` in `normaliseIpa()` + regenerate.
- [?] **Page weight** — the 11,796-word novella chapter is 2.23 MB HTML / 231 KB gz (worst page; next is 1.67 MB). Fix = serve the chapter gloss library as a static asset instead of Reader island props
- [?] (carried) **Widen `collect.url` in `astro/lighthouserc.json`?** — audit surface is still `/` only
- [?] **Trust Manifest (ARD "Trusted" level)** — deliberately omitted: the spec forbids an empty one; needs real signing keys
- [?] (carried) **`--` dialogue dashes** (La Barraca 243, andanzas 610) render literally
- [?] (carried) Nit: `chapterCount` calls everything «глава» — selva's 8 stories read as «8 глав»

## Next Steps

1. Decide on the `frequency.json` `/θ/` fix (one-line + regenerate)
2. (user decision) Page-weight fix and/or widening the audit surface
3. (carried) Re-check Cloudflare's agent-discoverability + contrast findings; next book candidates in `idea/findings.md`

## Key Decisions

- **Word-category display order (contracted)**: pronouns, core-verbs, prepositions, conjunctions, adverbs, numbers, interjections, frequency. `pronouns` must stay `[0]` (WordLesson/Chooser tests depend on it)
- **Adding a category is data-only** — chooser, `/words/[category]/`, sitemap and JSON-LD are generic; only `src/lib/words.ts` needs a new import + array entry
- **`frequency` is generated, not authored** — deterministic CLI reads all books' `glosses.json` + `tokens/`, merges glossaries by (lemma,pos) majority vote ignoring noisy labels (`name`/`other`/empty `ru`), counts lemmas, ranks top 200. Regeneration is byte-identical (verified)
- **Curated content conventions (locked by `pronouns.json`)**: broad seseo/neutral IPA with slashes stored in data; one short bilingual example per entry; `pos` = Spanish abbreviation (`prep.`, `loc. prep.`, `conj.`, `adv. conect.`, `interj.`, `num. card.`, `num. ord.`, `loc. num.`, `v. (ser)`…); `grammar`/`note` in Russian; `es` unique within a group; 2-space file indent, one entry per line
- (carried) Gloss model `deepseek-v4.1-flash:cloud --think high`; ai-catalog Minimal/Discoverable; colour-only links underlined; GA consent-gated; multi-language = subdirectory + hreflang (locked); v1 = reading + glosses only

## File Map

- `astro/scripts/lib/frequency.mjs` — pure merge/count/build helpers (`POS_RU`, `DEFAULT_EXCLUDE_POS`, `isNoisy`, `mergeGlossaries`, `countLemmaFrequency`, `buildFrequencyCategory`)
- `astro/scripts/build-frequency-words.mjs` — CLI; reads 4 books, writes `src/data/words/frequency.json`, prints `frequency: 4 books, 10813 lemmas, 9 groups, 200 entries`
- `astro/test/frequency.test.mjs` — 6 unit tests (merge vote, para prep, count 7/3/1, build limit/grouping, noisy exclusion)
- `astro/src/data/words/{prepositions,conjunctions,interjections,core-verbs,adverbs,numbers,frequency}.json` — new categories
- `astro/test/data/words/{prepositions,conjunctions,interjections,core-verbs,adverbs,numbers,frequency,categories}.test.ts` — data-shape tests (direct JSON import, except `categories.test.ts` which imports the registry)
- `astro/src/lib/words.ts` — MODIFIED: 8 imports + `categories` array in contract order; `languages`/`getCategory` unchanged
- `.pi/plans/add-word-categories/` — the executed plan (`_index.md` + 4 phase files)
- `astro/.tmp/frequency.prev.json` — idempotency check leftover (scratch)

## Gotchas / Warnings

- **Frequency entries carry book-data artifacts**: `ipa` comes from the winning gloss (`/θ/` as above); `lemma` merging can produce odd display lemmas (`su` renders as прил.). Regenerate with `node scripts/build-frequency-words.mjs` from `astro/`; output is deterministic/byte-identical
- **`astro check` sees new JSON via the registry** — a malformed category surfaces as a ts error in `words.ts`, but per-category tests import the JSON directly so they pass only if the category is well-formed
- **`grep -c` returns exit 1 on zero matches** — the frequency noisy-POS check prints `0` but exits non-zero; treat the printed value, not the exit code
- (carried) **Cloudflare audits ≠ Lighthouse**; `_headers` needs wrangler; `link-in-text-block` read from the JSON report
- (carried) **pi path guard**: leading-slash string literals / `\s`-style escapes trip it — use `path.join` in a `.tmp/` script
- (carried) Vitest/vite rewrites `new URL("<literal>", import.meta.url)`; LH one-lane-at-a-time; killing a gloss run needs the PowerShell matcher
