# Phase 2: Function-Word Categories

## Objective

Create four curated category data files and their tests: **prepositions**,
**conjunctions & connectors**, **interjections**, and **core verbs
(ser/estar/haber/tener)**. None of them is registered in `src/lib/words.ts` yet
(Phase 4 does that), so each WP is independently verifiable through its own
data test.

## Prerequisites

- No hard dependency on Phase 1 (this phase touches different files); follow
  the execution order and run it after Phase 1 for review hygiene.
- Read before starting: `astro/src/data/words/pronouns.json` (style reference),
  `astro/src/lib/types.ts` (`WordEntry`/`WordGroup`/`WordCategory`),
  `astro/test/data/words/pronouns.test.ts` (test reference).

## Shared Context

See Global Context in `_index.md` for the content conventions (IPA, `pos`
abbreviations, Russian `grammar`/`note`, examples).

**Category data contract (applies to every WP in this phase):**

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

**Data test contract (applies to every WP in this phase):** each
`astro/test/data/words/{id}.test.ts` imports the JSON directly and asserts:

1. `id`, `lang === "es"`, non-empty `title.ru` and `title.en`.
2. The exact group title list, in order:
   `expect(cat.groups.map(g => g.title)).toEqual([...])`.
3. `cat.groups` length equals that list's length and every group has ≥ 1 item.
4. Total entry count is within the WP's stated range.
5. Every entry: `es`, `pos`, `ru`, `ipa` non-empty; `example.es` and
   `example.ru` non-empty.
6. `es` unique within each group; every group title non-empty after `trim()`.

## Work Packages

### WP-4: Create the prepositions category

**Context:**
Spanish prepositions plus prepositional locutions (`locuciones prepositivas`).
The reader's books use many of these; La Barraca/andanzas also contain 1898
usages. `pos` values to use: `"prep."` for single words, `"loc. prep."` for
multi-word locutions. `grammar` should state case government and the core
meaning (e.g. for `por`: "причина, средство, место; por + сущ."). For `cabe`
and `so`, add a `note` marker `устарелое` (both are archaic and appear in
19th-century prose).

**Task:**
Create `astro/src/data/words/prepositions.json` —
`title: { ru: "Предлоги", en: "Prepositions" }`, 5 groups, total **90–115**
entries:

1. **"Простые предлоги"** — 23 items:
   `a, ante, bajo, cabe, con, contra, de, desde, durante, en, entre, hacia,
   hasta, mediante, para, por, según, sin, so, sobre, tras, versus, vía`
2. **"Предложные обороты места и направления"** — 26 items:
   `al lado de, alrededor de, cerca de, lejos de, dentro de, fuera de, encima
   de, debajo de, delante de, detrás de, frente a, junto a, en medio de, a
   través de, por encima de, por debajo de, por delante de, por detrás de, en
   torno a, en dirección a, camino de, al borde de, a la orilla de, en el fondo
   de, a la derecha de, a la izquierda de`
3. **"Предложные обороты времени"** — 14 items:
   `antes de, después de, a partir de, al cabo de, a lo largo de, de aquí a, de
   un momento a otro, a eso de, por la mañana, por la tarde, por la noche, de
   día, de noche, al mediodía`
4. **"Предложные обороты причины, цели и условия"** — 18 items:
   `a causa de, a consecuencia de, debido a, gracias a, por culpa de, a falta
   de, en vista de, a fin de, con objeto de, con el fin de, con tal de, en caso
   de, a pesar de, a condición de, en previsión de, so pena de, por miedo a, a
   fuerza de`
5. **"Предложные обороты замены, отношения и средства"** — 16 items:
   `en vez de, en lugar de, en contra de, respecto a, con respecto a, en cuanto
   a, en relación con, por medio de, por vía de, a base de, de acuerdo con, en
   nombre de, en favor de, a diferencia de, en función de, por obra de`

Create `astro/test/data/words/prepositions.test.ts` per the Data test contract,
with total range `90–115`.

**Files:**
- `astro/src/data/words/prepositions.json` — CREATE
- `astro/test/data/words/prepositions.test.ts` — CREATE

**Constraints:**
- DO: follow the Category data contract and `pronouns.json` formatting exactly.
- DO: use `"loc. prep."` as `pos` for every multi-word entry.
- DO: add `note: "устарелое"` for `cabe` and `so`; `note: null` elsewhere unless
  genuinely needed.
- DO: keep IPA seseo/neutral (`/ˈpaɾa/`, not `/ˈpaɾaθ/`).
- DO NOT: repeat the same `es` twice within one group.
- DO NOT: include `a`/`de`/`en` also inside the locution groups as standalone
  entries.
- DO NOT: register the category in `src/lib/words.ts` — Phase 4 does it.

**Success:**
- [ ] `test -f src/data/words/prepositions.json` → exit 0
- [ ] `node -e "const d=require('./src/data/words/prepositions.json');console.log(d.id, d.groups.length, d.groups.reduce((n,g)=>n+g.items.length,0))"`
      → `prepositions 5 <90..115>`
- [ ] `npx vitest run test/data/words/prepositions.test.ts` → exit 0
- [ ] `grep -c "loc. prep." src/data/words/prepositions.json` → ≥ 70
- [ ] `npx astro check` → exit 0

### WP-5: Create the conjunctions & connectors category

**Context:**
Two axes are deliberately separated: grammatical conjunctions (coordinating /
subordinating) and discourse connectors (linkers). `pos` values: `"conj."` for
conjunctions, `"loc. conj."` for multi-word subordinators (`a pesar de que`,
`siempre que`, …), `"conj. coord."` / `"conj. subord."` are NOT used — keep the
two short values above only. Connectors use `"adv. conect."`. `grammar` gives
the mood/tense the conjunction selects (e.g. `para que` → "плюсквамперфект
сослагательного: para que + subjuntivo"). Add `note: "сослагательное
наклонение"` on subordinators that require the subjunctive.

**Task:**
Create `astro/src/data/words/conjunctions.json` —
`title: { ru: "Союзы и связки", en: "Conjunctions & connectors" }`, 4 groups,
total **80–100** entries:

1. **"Сочинительные союзы"** — 14 items:
   `y, e, o, u, ni, pero, sino, mas, que, como, así como, tanto... como, no
   solo... sino también, o bien`
2. **"Подчинительные союзы"** — 33 items:
   `que, si, como, porque, pues, aunque, mientras, cuando, donde, según,
   apenas, ya que, puesto que, dado que, en cuanto, tan pronto como, antes de
   que, después de que, para que, a fin de que, con tal de que, sin que, a
   menos que, siempre que, a condición de que, por más que, a pesar de que, de
   modo que, de manera que, como si, hasta que, desde que, mientras que`
3. **"Связки: контраст и уступка"** — 14 items:
   `sin embargo, no obstante, en cambio, por el contrario, al contrario, si
   bien, ahora bien, con todo, aun así, de todas formas, de todos modos, eso
   sí, después de todo, ni aun así`
4. **"Связки: добавление, пояснение, вывод"** — 24 items:
   `además, encima, es más, también, asimismo, igualmente, por añadidura, es
   decir, o sea, esto es, en otras palabras, mejor dicho, por ejemplo, en
   efecto, de hecho, en resumen, en fin, por último, finalmente, por lo tanto,
   por consiguiente, en consecuencia, así pues, entonces`

Create `astro/test/data/words/conjunctions.test.ts` per the Data test contract,
with total range `80–100`.

**Files:**
- `astro/src/data/words/conjunctions.json` — CREATE
- `astro/test/data/words/conjunctions.test.ts` — CREATE

**Constraints:**
- DO: follow the Category data contract and `pronouns.json` formatting exactly.
- DO: use `pos: "conj."` for single-word conjunctions, `"loc. conj."` for
  multi-word conjunctions, `"adv. conect."` for discourse connectors.
- DO: set `note: "сослагательное наклонение"` on `antes de que`, `para que`,
  `a fin de que`, `con tal de que`, `sin que`, `a menos que`, `siempre que`,
  `a condición de que`, `como si`.
- DO: for each connector, `example` must show it at the start or middle of a
  two-clause sentence.
- DO NOT: reuse the same `es` within one group.
- DO NOT: register the category in `src/lib/words.ts`.

**Success:**
- [ ] `test -f src/data/words/conjunctions.json` → exit 0
- [ ] `node -e "const d=require('./src/data/words/conjunctions.json');console.log(d.id, d.groups.length, d.groups.reduce((n,g)=>n+g.items.length,0))"`
      → `conjunctions 4 <80..100>`
- [ ] `npx vitest run test/data/words/conjunctions.test.ts` → exit 0
- [ ] `npx astro check` → exit 0

### WP-6: Create the interjections category

**Context:**
The reader's books are dialogue-heavy (La Barraca's Valencian speech, Unamuno's
essays), so interjections show up constantly. Interjections are used as
standalone utterances; `es` may include the Spanish opening `¡`/`?` where that
is the conventional written form (`"¡ay!"`), but plain greetings stay plain
(`"hola"`). `pos` is `"interj."` for all entries. `grammar` should be
`"междометие"` unless there is something more useful to say (e.g. `ojalá` →
"выражает желание; всегда с subjuntivo"). Register must be marked in `note`
(`разговорное`, `грубое`, `эвфемизм`) — the last group is coarse language that
appears in these 19th/early-20th-century texts.

**Task:**
Create `astro/src/data/words/interjections.json` —
`title: { ru: "Междометия", en: "Interjections" }`, 6 groups, total **80–95**
entries:

1. **"Приветствия и прощания"** — 16 items:
   `hola, buenos días, buenas tardes, buenas noches, ¿qué tal?, ¿cómo estás?,
   ¿qué pasa?, adiós, hasta luego, hasta pronto, hasta mañana, nos vemos, chao,
   saludos, bienvenido, bienvenida`
2. **"Вежливость"** — 13 items:
   `por favor, gracias, muchas gracias, de nada, perdón, disculpe, con permiso,
   lo siento, mucho gusto, encantado, salud, ¡provecho!, ¡enhorabuena!`
3. **"Удивление и радость"** — 14 items:
   `¡ay!, ¡oh!, ¡ah!, ¡vaya!, ¡caramba!, ¡anda!, ¡no me digas!, ¡qué va!,
   ¡ojalá!, ¡bravo!, ¡hurra!, ¡qué bien!, ¡qué alegría!, ¡magnífico!`
4. **"Досада, боль, страх"** — 13 items:
   `¡uy!, ¡uf!, ¡puf!, ¡ay de mí!, ¡Dios mío!, ¡madre mía!, ¡por Dios!, ¡qué
   horror!, ¡qué pena!, ¡lástima!, ¡pobre de mí!, ¡válgame!, ¡demonios!`
5. **"Побуждение, внимание, окрики"** — 18 items:
   `¡oye!, ¡oiga!, ¡mira!, ¡vamos!, ¡venga!, ¡ándale!, ¡arriba!, ¡ánimo!,
   ¡cuidado!, ¡atención!, ¡socorro!, ¡auxilio!, ¡fuera!, ¡basta!, ¡silencio!,
   ¡chitón!, ¡ea!, ¡hala!`
6. **"Разговорное и бранное"** — 11 items:
   `joder, ¡jolín!, ¡jolines!, ¡caray!, ¡hostia!, ¡coño!, ¡mierda!, ¡diablos!,
   ¡porras!, ¡leche!, ¡narices!`

Create `astro/test/data/words/interjections.test.ts` per the Data test contract,
with total range `80–95`.

**Files:**
- `astro/src/data/words/interjections.json` — CREATE
- `astro/test/data/words/interjections.test.ts` — CREATE

**Constraints:**
- DO: follow the Category data contract and `pronouns.json` formatting exactly.
- DO: add a register `note` on every item in group 6 (`грубое` or `эвфемизм`).
- DO: keep the Russian translation colloquial where the Spanish is colloquial
  (`¡vaya!` → "ну и ну!", `¡anda!` → "да ну!").
- DO NOT: reuse the same `es` within one group.
- DO NOT: register the category in `src/lib/words.ts`.
- DO NOT: invent interjections that are not used in Spanish.

**Success:**
- [ ] `test -f src/data/words/interjections.json` → exit 0
- [ ] `node -e "const d=require('./src/data/words/interjections.json');console.log(d.id, d.groups.length, d.groups.reduce((n,g)=>n+g.items.length,0))"`
      → `interjections 6 <80..95>`
- [ ] `npx vitest run test/data/words/interjections.test.ts` → exit 0
- [ ] `npx astro check` → exit 0

### WP-7: Create the core-verbs category

**Context:**
Beginner core verbs. Scope is deliberately narrow: **present indicative only**
plus the impersonal `hay`, the `ser`/`estar` meaning contrast, and `tener`
idioms. `pos` is `"v."` (or `"v. (ser)"`, `"v. (estar)"`, `"v. (haber)"`,
`"v. (tener)"` — the parenthetical names the infinitive). `grammar` states
person + tense in Russian (`"1-е лицо ед. ч., presente de indicativo"`).
Do NOT add pretérito/imperfecto/futuro forms — out of scope.

**Task:**
Create `astro/src/data/words/core-verbs.json` —
`title: { ru: "Сер, эстар, хабер, тенер", en: "Core verbs: ser, estar, haber, tener" }`,
6 groups, total **44–52** entries:

1. **"ser — быть (постоянное)"** — 6 items: `soy, eres, es, somos, sois, son`
2. **"estar — быть, находиться (состояние)"** — 6 items:
   `estoy, estás, está, estamos, estáis, están`
3. **"haber — иметь (вспомогательный); hay"** — 7 items:
   `he, has, ha, hemos, habéis, han, hay`
4. **"tener — иметь"** — 6 items:
   `tengo, tienes, tiene, tenemos, tenéis, tienen`
5. **"ser vs estar — значение меняется"** — 10 items (each `es` is the
   contrast pair, `grammar` explains the meaning shift, `example.es` shows both
   sentences separated by `" / "`):
   `ser listo / estar listo, ser aburrido / estar aburrido, ser rico / estar
   rico, ser verde / estar verde, ser bueno / estar bueno, ser malo / estar
   malo, ser vivo / estar vivo, ser seguro / estar seguro, ser atento / estar
   atento, ser cansado / estar cansado`
6. **"Устойчивые выражения с tener"** — 13 items:
   `tener que + inf., tener ganas de, tener razón, tener hambre, tener sed,
   tener frío, tener calor, tener sueño, tener miedo, tener prisa, tener años,
   tener suerte, no tener ni idea`

Create `astro/test/data/words/core-verbs.test.ts` per the Data test contract,
with total range `44–52`.

**Files:**
- `astro/src/data/words/core-verbs.json` — CREATE
- `astro/test/data/words/core-verbs.test.ts` — CREATE

**Constraints:**
- DO: follow the Category data contract and `pronouns.json` formatting exactly.
- DO: for group 5, `example.ru` translates both sentences
  (`"Он умный. / Он готов."`).
- DO: for group 6, `es` is the idiom and `example.es` is a full sentence using it.
- DO: use seseo/neutral IPA (`sois` → `/sojs/`, `estáis` → `/esˈtajs/`).
- DO NOT: add non-present tenses, the imperative, or the subjunctive.
- DO NOT: use a bare `ser`/`estar`/`haber`/`tener` entry outside group 6.
- DO NOT: register the category in `src/lib/words.ts`.

**Success:**
- [ ] `test -f src/data/words/core-verbs.json` → exit 0
- [ ] `node -e "const d=require('./src/data/words/core-verbs.json');console.log(d.id, d.groups.length, d.groups.reduce((n,g)=>n+g.items.length,0))"`
      → `core-verbs 6 <44..52>`
- [ ] `npx vitest run test/data/words/core-verbs.test.ts` → exit 0
- [ ] `npx astro check` → exit 0

## Phase Verification

After WP-4 → WP-7 are complete, run from `astro/`:

```bash
npx vitest run test/data/words
npx astro check
npm run build
```

- [ ] All four new data tests plus `pronouns.test.ts` and
      `frequency.test.ts` pass (vitest exits 0)
- [ ] No type errors (`astro check` exits 0)
- [ ] Build succeeds (`npm run build` exits 0)
- [ ] None of the four new categories is live yet (wiring is Phase 4):
      `test ! -d dist/words/prepositions && test ! -d dist/words/conjunctions && test ! -d dist/words/interjections && test ! -d dist/words/core-verbs` → exit 0
- [ ] `git status --short src/data/words` lists exactly the 4 new JSON files
      plus `frequency.json` from Phase 1 (no unexpected files)
