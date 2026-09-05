# Phase 1: Data Model & Content

## Objective

Lay the data foundation: `lang` on books, the word-category types, the full
pronouns lesson content, and the words registry. Nothing here touches pages yet —
the app still builds and runs after this phase.

## Prerequisites

- Repo state: uncommitted hamburger menu + dark theme work (fine — do not commit anything)
- Node 22+ and the `astro/` dependencies installed (`cd astro && npm install` has been run)

## Shared Context

See Global Context in `_index.md`. The types file `astro/src/lib/types.ts` currently
exports: `Gloss`, `Token`, `ChapterMeta`, `BookMeta` (id, title, author, source,
chapters), `GlossLibrary`. The books registry `astro/src/lib/books.ts` imports
`andanzasMeta` from `../data/books/andanzas/meta.json` and exports `books` and
`getBook(id)`. JSON files are imported directly (Astro/Vite handles this — see
`lib/books.ts`).

## Work Packages

### WP-1: Add `lang` to BookMeta and add word-category types

**Context:**
`astro/src/lib/types.ts` defines `BookMeta` (id, title, author, source, chapters:
`ChapterMeta[]`). `astro/src/data/books/andanzas/meta.json` is the only book
metadata file — it has `id`, `title`, `author`, `source`, `chapters` (41 entries).
The decision record `idea/routing.md` §5 requires `BookMeta.lang` and a
`WordCategory.lang` field. Read `astro/src/lib/types.ts` and
`astro/src/data/books/andanzas/meta.json` first.

**Task:**
Add a `lang: string` field to `BookMeta`, add three new interfaces
(`WordEntry`, `WordGroup`, `WordCategory`) to `types.ts`, and add `"lang": "es"`
to `meta.json`.

**Files:**

- `astro/src/lib/types.ts` — MODIFY — add `lang: string` to `BookMeta`; append the three new interfaces
- `astro/src/data/books/andanzas/meta.json` — MODIFY — add `"lang": "es"` as the second field (after `"id"`)

**Constraints:**

- DO: Add `lang: string` to `BookMeta` — place it after `id` (before `title`)
- DO: Add these exact interfaces to `types.ts` (after `BookMeta`):

```ts
export interface WordEntry {
  es: string;
  pos: string;
  ru: string;
  grammar?: string | null;
  note?: string | null;
}
export interface WordGroup {
  title: string;
  note?: string | null;
  items: WordEntry[];
}
export interface WordCategory {
  id: string;
  lang: string;
  title: { ru: string; en: string };
  groups: WordGroup[];
}
```

- DO: In `meta.json`, add `"lang": "es",` right after the `"id"` line (keep valid JSON — trailing commas are NOT allowed in JSON)
- DO NOT: Change any other field in `meta.json` (chapters stay untouched)
- DO NOT: Change `Gloss`, `Token`, `ChapterMeta`, or `GlossLibrary`

**Success:**

- [ ] `grep -c "lang: string" astro/src/lib/types.ts` → 2 (BookMeta.lang + WordCategory.lang)
- [ ] `grep -c "WordCategory" astro/src/lib/types.ts` → 1 (the interface declaration — nothing uses it yet)
- [ ] `grep -n '"lang": "es"' astro/src/data/books/andanzas/meta.json` → 1 match
- [ ] JSON valid: `cd astro && node -e "JSON.parse(require('fs').readFileSync('src/data/books/andanzas/meta.json','utf8')); console.log('ok')"` → prints `ok`
- [ ] No type errors: `cd astro && npx astro check` → exit 0

### WP-2: Create the pronouns lesson data file

**Context:**
The words tree needs its first lesson. The schema is defined in WP-1:
`WordCategory` = `{ id, lang, title: {ru, en}, groups: [{ title, note?, items: [{ es, pos, ru, grammar?, note? }] }] }`.
The lesson is Spanish pronouns with Russian definitions — content is Russian
(like glosses), so group titles and notes are plain Russian strings, NOT localized.
The file goes in `astro/src/data/words/pronouns.json` (new directory).

**Task:**
Create `astro/src/data/words/pronouns.json` with the exact content below:
`id: "pronouns"`, `lang: "es"`, `title: { ru: "Местоимения", en: "Pronouns" }`,
and 9 groups. Transcribe each table row into an item object. `pos` values are
exact strings — copy them verbatim. `grammar` and `note` are `null` when the
table cell is empty.

**Files:**

- `astro/src/data/words/pronouns.json` — CREATE — the full lesson

**Constraints:**

- DO: Use exactly these `pos` strings: `pron. pers.`, `pron. pers. (acus.)`,
  `pron. pers. (dat.)`, `pron. pers. (prep.)`, `pron. poses.`, `pron. dem.`,
  `pron. rel.`, `pron. interr.`, `pron. indef.`
- DO: Keep the group order 1–9 exactly as listed
- DO: `es` values with slashes are ONE item (e.g. `"es": "mi / mis"`)
- DO: Valid JSON — no trailing commas, UTF-8 (Russian text is fine)
- DO NOT: Add or remove entries, change wording, or reorder rows
- DO NOT: Add fields beyond the schema (no `ipa`, no `cefr`)

**Group 1 — title: `Личные (подлежащее)`**

| es | pos | ru | grammar | note |
|---|---|---|---|---|
| yo | pron. pers. | я | 1-е лицо, ед. ч. | |
| tú | pron. pers. | ты | 2-е лицо, ед. ч. | |
| vos | pron. pers. | ты | 2-е лицо, ед. ч. | voseo: употребляется в Аргентине, Уругвае и др. вместо tú |
| usted | pron. pers. | Вы (вежл.) | 3-е лицо, ед. ч. | вежливая форма, согласуется с глаголом в 3-м лице |
| él | pron. pers. | он | 3-е лицо, ед. ч., м. р. | |
| ella | pron. pers. | она | 3-е лицо, ед. ч., ж. р. | |
| nosotros | pron. pers. | мы | 1-е лицо, мн. ч., м. р. | также для смешанной группы |
| nosotras | pron. pers. | мы | 1-е лицо, мн. ч., ж. р. | только о женщинах |
| vosotros | pron. pers. | вы | 2-е лицо, мн. ч., м. р. | только в Испании |
| vosotras | pron. pers. | вы | 2-е лицо, мн. ч., ж. р. | только в Испании |
| ustedes | pron. pers. | вы; Вы (вежл. мн.) | 3-е лицо, мн. ч. | в Испании — только вежливое мн. ч.; в Латинской Америке заменяет vosotros |
| ellos | pron. pers. | они | 3-е лицо, мн. ч., м. р. | |
| ellas | pron. pers. | они | 3-е лицо, мн. ч., ж. р. | |

**Group 2 — title: `Прямое дополнение (винительный падеж)`**

| es | pos | ru | grammar | note |
|---|---|---|---|---|
| me | pron. pers. (acus.) | меня | 1-е лицо, ед. ч. | |
| te | pron. pers. (acus.) | тебя | 2-е лицо, ед. ч. | |
| lo | pron. pers. (acus.) | его; это | 3-е лицо, ед. ч., м. р. | в Испании также вежливое «Вас» (м. р.) |
| la | pron. pers. (acus.) | её | 3-е лицо, ед. ч., ж. р. | в Испании также вежливое «Вас» (ж. р.) |
| nos | pron. pers. (acus.) | нас | 1-е лицо, мн. ч. | |
| os | pron. pers. (acus.) | вас | 2-е лицо, мн. ч. | только в Испании |
| los | pron. pers. (acus.) | их | 3-е лицо, мн. ч., м. р. | также вежливое «Вас» (мн. ч.) |
| las | pron. pers. (acus.) | их | 3-е лицо, мн. ч., ж. р. | также вежливое «Вас» (мн. ч., ж. р.) |

**Group 3 — title: `Косвенное дополнение (дательный падеж)`**

| es | pos | ru | grammar | note |
|---|---|---|---|---|
| me | pron. pers. (dat.) | мне | 1-е лицо, ед. ч. | |
| te | pron. pers. (dat.) | тебе | 2-е лицо, ед. ч. | |
| le | pron. pers. (dat.) | ему, ей, Вам | 3-е лицо, ед. ч. | |
| nos | pron. pers. (dat.) | нам | 1-е лицо, мн. ч. | |
| os | pron. pers. (dat.) | вам | 2-е лицо, мн. ч. | только в Испании |
| les | pron. pers. (dat.) | им, Вам | 3-е лицо, мн. ч. | |

**Group 4 — title: `Предложные (после предлогов)`**
Group note: `После предлогов также используются формы подлежащего: para él, para ella, para usted, para nosotros, para vosotros, para ellos.`

| es | pos | ru | grammar | note |
|---|---|---|---|---|
| mí | pron. pers. (prep.) | меня | 1-е лицо, ед. ч. | после предлога: para mí |
| ti | pron. pers. (prep.) | тебя | 2-е лицо, ед. ч. | после предлога: para ti |
| sí | pron. pers. (prep.) | себя | 3-е лицо | после предлога: para sí |
| conmigo | pron. pers. (prep.) | со мной | 1-е лицо, ед. ч. | слитная форма: con + mí |
| contigo | pron. pers. (prep.) | с тобой | 2-е лицо, ед. ч. | слитная форма: con + ti |
| consigo | pron. pers. (prep.) | с собой | 3-е лицо | слитная форма: con + sí |

**Group 5 — title: `Притяжательные`**
Group note: `Краткие формы стоят перед существительным (mi casa); полные — после существительного (un amigo mío) или с артиклем (el mío).`

| es | pos | ru | grammar | note |
|---|---|---|---|---|
| mi / mis | pron. poses. | мой, моя / мои | 1-е лицо, ед. ч. | |
| tu / tus | pron. poses. | твой, твоя / твои | 2-е лицо, ед. ч. | |
| su / sus | pron. poses. | его, её, Ваш, их | 3-е лицо | |
| nuestro / nuestra / nuestros / nuestras | pron. poses. | наш / наша / наши | 1-е лицо, мн. ч. | |
| vuestro / vuestra / vuestros / vuestras | pron. poses. | ваш / ваша / ваши | 2-е лицо, мн. ч. | только в Испании |
| mío / mía / míos / mías | pron. poses. | мой (полная форма) | 1-е лицо, ед. ч. | un amigo mío |
| tuyo / tuya / tuyos / tuyas | pron. poses. | твой (полная форма) | 2-е лицо, ед. ч. | un amigo tuyo |
| suyo / suya / suyos / suyas | pron. poses. | его, её, их (полная форма) | 3-е лицо | un amigo suyo |

**Group 6 — title: `Указательные`**

| es | pos | ru | grammar | note |
|---|---|---|---|---|
| este / esta / estos / estas | pron. dem. | этот / эта / эти | близко к говорящему | |
| ese / esa / esos / esas | pron. dem. | тот / та / те | ближе к собеседнику | |
| aquel / aquella / aquellos / aquellas | pron. dem. | тот / та / те | далеко от обоих | |
| esto | pron. dem. | это | ср. род, без существительного | |
| eso | pron. dem. | то | ср. род, без существительного | |
| aquello | pron. dem. | то (далёкое) | ср. род, без существительного | |

**Group 7 — title: `Относительные`**

| es | pos | ru | grammar | note |
|---|---|---|---|---|
| que | pron. rel. | который, которая; что | неизменяемое | |
| quien / quienes | pron. rel. | кто; который | о людях | |
| el que / la que / los que / las que | pron. rel. | тот, который / та, которая / те, которые | согласуется с существительным | |
| lo que | pron. rel. | то, что | ср. род | |
| cuyo / cuya / cuyos / cuyas | pron. rel. | чей / чья / чьи | притяжательное относительное | |

**Group 8 — title: `Вопросительные и восклицательные`**

| es | pos | ru | grammar | note |
|---|---|---|---|---|
| qué | pron. interr. | что? какой? | всегда с ударением | |
| quién / quiénes | pron. interr. | кто? | ед. / мн. ч. | |
| cuál / cuáles | pron. interr. | который? какой? | какой из? | |
| cuánto / cuánta / cuántos / cuántas | pron. interr. | сколько? | согласуется с существительным | |

**Group 9 — title: `Неопределённые`**

| es | pos | ru | grammar | note |
|---|---|---|---|---|
| alguien | pron. indef. | кто-то, кто-нибудь | только о людях | |
| nadie | pron. indef. | никто | только о людях | |
| algo | pron. indef. | что-то, нечто | только о предметах | |
| nada | pron. indef. | ничто, ничего | только о предметах | |
| alguno / alguna / algunos / algunas | pron. indef. | какой-нибудь, некоторый | | |
| ninguno / ninguna | pron. indef. | никакой, ни один | | |
| cada | pron. indef. | каждый | неизменяемое | |
| cualquiera | pron. indef. | любой, какой угодно | | |
| todo / toda / todos / todas | pron. indef. | весь, вся, все | | |
| otro / otra / otros / otras | pron. indef. | другой, иная, другие | | |
| mucho / mucha / muchos / muchas | pron. indef. | много, многие | | |
| poco / poca / pocos / pocas | pron. indef. | мало, немногие | | |
| varios / varias | pron. indef. | несколько, некоторые | | |

**Success:**

- [ ] File exists: `test -f astro/src/data/words/pronouns.json` → exit 0
- [ ] Valid JSON + schema: `cd astro && node -e "const d=require('./src/data/words/pronouns.json'); if(d.id!=='pronouns'||d.lang!=='es'||d.groups.length!==9) throw new Error('bad'); console.log('ok')"` → prints `ok`
- [ ] Item count: `cd astro && node -e "const d=require('./src/data/words/pronouns.json'); console.log(d.groups.reduce((n,g)=>n+g.items.length,0))"` → prints `69`
- [ ] Every item has es/pos/ru: `cd astro && node -e "const d=require('./src/data/words/pronouns.json'); d.groups.forEach(g=>g.items.forEach(i=>{if(!i.es||!i.pos||!i.ru) throw new Error('missing field')})); console.log('ok')"` → prints `ok`

### WP-3: Create the words registry

**Context:**
`astro/src/lib/books.ts` shows the registry pattern: import a JSON data file,
export a typed array, export a lookup function. The `WordCategory` type comes from
`astro/src/lib/types.ts` (WP-1). The pronouns data file was created in WP-2.

**Task:**
Create `astro/src/lib/words.ts` exporting `languages` (the source-language
registry), `categories` (all word categories), and `getCategory(id)`.

**Files:**

- `astro/src/lib/words.ts` — CREATE

**Constraints:**

- DO: Export exactly:

```ts
import pronouns from "../data/words/pronouns.json";
import type { WordCategory } from "./types";

export const languages: { id: string; name: string }[] = [
  { id: "es", name: "Español" },
];

export const categories: WordCategory[] = [pronouns];

export function getCategory(id: string): WordCategory | undefined {
  return categories.find((c) => c.id === id);
}
```

- DO: Follow the import style of `lib/books.ts` (default import of the JSON)
- DO NOT: Add a `getCategories(lang)` helper — filtering happens in the components
- DO NOT: Add more languages or categories

**Success:**

- [ ] File exists: `test -f astro/src/lib/words.ts` → exit 0
- [ ] `grep -n "export const languages" astro/src/lib/words.ts` → 1 match
- [ ] `grep -n "export const categories" astro/src/lib/words.ts` → 1 match
- [ ] `grep -n "export function getCategory" astro/src/lib/words.ts` → 1 match
- [ ] No type errors: `cd astro && npx astro check` → exit 0

## Phase Verification

After all work packages are complete, run:

```bash
cd astro && npx astro check
cd astro && npm run build
cd astro && npm test
```

- [ ] `astro check` exits 0 (no type errors)
- [ ] `npm run build` exits 0 (site still builds with the new data)
- [ ] `npm test` exits 0 (existing tests still pass)
