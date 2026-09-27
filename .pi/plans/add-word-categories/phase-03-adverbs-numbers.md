# Phase 3: Adverbs & Numbers

## Objective

Create the two larger curated category files and their tests: **adverbs** and
**numbers**. Like Phase 2, neither is registered in `src/lib/words.ts` yet
(Phase 4 does that), so each WP is independently verifiable.

## Prerequisites

- Phase 2 complete (WP-4 → WP-7 verified).
- Read before starting: `astro/src/data/words/pronouns.json` (style reference),
  `astro/test/data/words/pronouns.test.ts` (test reference).

## Shared Context

See Global Context in `_index.md` for the content conventions (IPA, `pos`
abbreviations, Russian `grammar`/`note`, examples). The two contracts below are
self-contained copies of the ones in `phase-02-function-words.md`; they apply
unchanged here (no need to open phase 2).

**Category data contract:**

- File top level: `{ "id": "...", "lang": "es", "title": { "ru": "...", "en": "..." }, "groups": [ ... ] }`.
- `groups[].title` is a plain Russian string; `groups[].note` is optional
  Russian prose (omit unless a group needs a usage note).
- Every entry has, in this key order:
  `es`, `ipa`, `pos`, `ru`, `example: { es, ru }`, `grammar`, `note`.
- `ipa` includes the surrounding slashes (`"/a/"`).
- Every entry's `es` is unique within its group.
- Write the JSON in the compact style of `pronouns.json`: 2-space file indent,
  each entry object on one line, `null` for absent `note`.
- The item lists below are the **exact intended contents**. If a listed item is
  not a real, naturally used Spanish word/phrase, replace it with the closest
  real equivalent and record the substitution in your WP report — do not invent
  Spanish.

**Data test contract:** each `astro/test/data/words/{id}.test.ts` imports the
JSON directly and asserts:

1. `id`, `lang === "es"`, non-empty `title.ru` and `title.en`.
2. The exact group title list, in order:
   `expect(cat.groups.map(g => g.title)).toEqual([...])`.
3. `cat.groups` length equals that list's length and every group has ≥ 1 item.
4. Total entry count is within the WP's stated range.
5. Every entry: `es`, `pos`, `ru`, `ipa` non-empty; `example.es` and
   `example.ru` non-empty.
6. `es` unique within each group; every group title non-empty after `trim()`.

## Work Packages

### WP-8: Create the adverbs category

**Context:**
Spanish adverbs grouped by meaning. `pos` is `"adv."` for all entries. `grammar`
should give the function in Russian (e.g. `aquí` → "место; ближе к говорящему,
чем allí"). Overlap with other categories is expected and fine — this file only
requires `es` uniqueness **within each group**. The interrogative/relative
adverbs in group 6 repeat meanings from the pronouns category; include them
here because learners look them up by function, not by part of speech. Keep
`note: null` unless there is a real usage remark (e.g. accent disambiguation:
`aún` → "ещё (с ударением); aún vs aun").

**Task:**
Create `astro/src/data/words/adverbs.json` —
`title: { ru: "Наречия", en: "Adverbs" }`, 6 groups, total **105–130** entries:

1. **"Места"** — 22 items:
   `aquí, acá, ahí, allí, allá, cerca, lejos, arriba, abajo, dentro, fuera,
   adentro, afuera, delante, detrás, encima, debajo, enfrente, junto,
   alrededor, acullá, dondequiera`
2. **"Времени"** — 25 items:
   `ahora, hoy, ayer, anteayer, mañana, pasado mañana, anoche, luego, después,
   antes, pronto, temprano, tarde, siempre, nunca, jamás, ya, todavía, aún,
   mientras, entonces, actualmente, recientemente, últimamente, próximamente`
3. **"Образа действия"** — 20 items:
   `bien, mal, así, despacio, deprisa, rápido, juntos, apenas, casi, sólo,
   incluso, también, tampoco, adrede, aposta, a propósito, quedo, recio, a la
   vez, de repente`
4. **"Количества и степени"** — 19 items:
   `muy, mucho, poco, bastante, demasiado, más, menos, tanto, tan, cuánto, al
   menos, por lo menos, nada, todo, harto, medio, del todo, en absoluto, casi
   no`
5. **"Утверждение, отрицание, сомнение"** — 16 items:
   `sí, no, quizá, quizás, tal vez, acaso, seguramente, ciertamente, desde
   luego, efectivamente, en efecto, probablemente, posiblemente, claro, por
   supuesto, ni hablar`
6. **"Вопросительные и относительные"** — 7 items:
   `dónde, cuándo, cómo, cuánto, por qué, adónde, para qué`

Create `astro/test/data/words/adverbs.test.ts` per the Data test contract, with
total range `105–130`.

**Files:**
- `astro/src/data/words/adverbs.json` — CREATE
- `astro/test/data/words/adverbs.test.ts` — CREATE

**Constraints:**
- DO: follow the Category data contract and `pronouns.json` formatting exactly.
- DO: add `note` on `aún` (accent distinction from `aun`), `más` (accent vs
  `mas` "но"), `sólo` (traditional accent, modern RAE spelling `solo`), and
  `quizá`/`quizás` (free variants).
- DO: keep the group-4 item list at 19 — do not re-add `apenas`, `casi`, or
  `sólo` which already live in group 3.
- DO: use seseo/neutral IPA; no `/θ/`.
- DO NOT: reuse the same `es` within one group (duplicates across groups are
  allowed).
- DO NOT: register the category in `src/lib/words.ts`.

**Success:**
- [ ] `test -f src/data/words/adverbs.json` → exit 0
- [ ] `node -e "const d=require('./src/data/words/adverbs.json');console.log(d.id, d.groups.length, d.groups.reduce((n,g)=>n+g.items.length,0))"`
      → `adverbs 6 <105..130>`
- [ ] `npx vitest run test/data/words/adverbs.test.ts` → exit 0
- [ ] `npx astro check` → exit 0

### WP-9: Create the numbers category

**Context:**
Cardinal and ordinal numbers plus fractions/collectives. `pos` values:
`"num. card."` for cardinals, `"num. ord."` for ordinals, `"loc. num."` for
multi-word numeric expressions. `grammar` must note the key morphosyntax in
Russian, e.g. `uno` → "перед сущ. м.р. → un; перед сущ. ж.р. → una",
`veintiuno` → "перед сущ. м.р. → veintiún", `primero` → "перед сущ. м.р. →
primer", `cien` → "перед сущ./числ. → ciento (ciento uno); отдельно → cien".

**Task:**
Create `astro/src/data/words/numbers.json` —
`title: { ru: "Числа", en: "Numbers" }`, 5 groups, total **80–100** entries:

1. **"Количественные 0–20"** — 21 items:
   `cero, uno, dos, tres, cuatro, cinco, seis, siete, ocho, nueve, diez, once,
   doce, trece, catorce, quince, dieciséis, diecisiete, dieciocho, diecinueve,
   veinte`
2. **"Десятки"** — 8 items:
   `treinta, cuarenta, cincuenta, sesenta, setenta, ochenta, noventa, cien`
3. **"21–29, сотни, тысячи"** — 20 items:
   `veintiuno, veintidós, veintitrés, veinticuatro, veinticinco, veintiséis,
   veintisiete, veintiocho, veintinueve, doscientos, trescientos,
   cuatrocientos, quinientos, seiscientos, setecientos, ochocientos,
   novecientos, mil, millón, billón`
4. **"Порядковые 1–20"** — 20 items:
   `primero, segundo, tercero, cuarto, quinto, sexto, séptimo, octavo, noveno,
   décimo, undécimo, duodécimo, decimotercero, decimocuarto, decimoquinto,
   decimosexto, decimoséptimo, decimoctavo, decimonoveno, vigésimo`
5. **"Дроби, собирательные, приблизительные"** — 13 items:
   `medio, un tercio, un cuarto, tres cuartos, una docena, una decena, un par,
   ambos, sendos, cientos, miles, una vez, la mitad`

Create `astro/test/data/words/numbers.test.ts` per the Data test contract, with
total range `80–100`.

**Files:**
- `astro/src/data/words/numbers.json` — CREATE
- `astro/test/data/words/numbers.test.ts` — CREATE

**Constraints:**
- DO: follow the Category data contract and `pronouns.json` formatting exactly.
- DO: put the apocope rules (`un`, `veintiún`, `primer`) in `grammar` of the
  corresponding entry, not as separate entries.
- DO: use IPA for the full word (`veintiuno` → `/beintiˈuno/`, seseo: `cero` →
  `/ˈseɾo/`, `cinco` → `/ˈsinko/`).
- DO: examples use the number in a short sentence (`Tengo veinte años.`).
- DO NOT: add numbers above `mil`/`millón`/`billón` as separate entries.
- DO NOT: register the category in `src/lib/words.ts`.

**Success:**
- [ ] `test -f src/data/words/numbers.json` → exit 0
- [ ] `node -e "const d=require('./src/data/words/numbers.json');console.log(d.id, d.groups.length, d.groups.reduce((n,g)=>n+g.items.length,0))"`
      → `numbers 5 <80..100>`
- [ ] `npx vitest run test/data/words/numbers.test.ts` → exit 0
- [ ] `npx astro check` → exit 0

## Phase Verification

After WP-8 → WP-9 are complete, run from `astro/`:

```bash
npx vitest run test/data/words
npx astro check
npm run build
```

- [ ] All six curated data tests plus `pronouns.test.ts` and
      `frequency.test.ts` pass (vitest exits 0)
- [ ] No type errors (`astro check` exits 0)
- [ ] Build succeeds (`npm run build` exits 0)
- [ ] `test ! -d dist/words/adverbs && test ! -d dist/words/numbers` → exit 0
      (wiring is Phase 4)
- [ ] `ls src/data/words/*.json` lists 8 files (pronouns + 7 new)
