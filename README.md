# Learn Spanish — Aprende español

A static, mobile-first Spanish-learning web app. Read Miguel de Unamuno's *Andanzas y visiones españolas* (1922, public domain) with a gloss for every word: Russian translation, grammar explanation of the surface form, IPA, lemma, POS, CEFR level, modern equivalent, false-friend warnings, and notes.

**Live:** <https://learn-words-5mq.pages.dev/>

## Features

- **41 chapters** of Unamuno's travel essays, tokenized word-by-word
- **Gloss popup** on every glossable word — tooltip on hover (desktop, click to pin), bottom sheet on tap (mobile), keyboard accessible (Tab + Enter/Space, Esc)
- **~11,600 glosses** generated at build time by an LLM pipeline (Russian translations, grammar of the surface form, IPA, CEFR)
- **RU/EN UI toggle** — gloss content is always Russian
- **Phrase recognition** — multi-word units ("a pesar de") glossed as one

## Tech stack

- [Astro 7](https://astro.build) + Tailwind CSS 4 + React 19 islands (in `astro/`)
- TypeScript strict, Vitest for script tests
- Plain ESM Node scripts (`.mjs`, built-ins only) for the data pipeline

## Development

```bash
cd astro
npm install
npm run dev        # dev server on :4321
npm test           # vitest (tokenizer + gloss-parse)
npx astro check    # type check
npm run build      # static build → astro/dist/
```

## Data pipeline

The book data lives in `astro/src/data/books/andanzas/` (committed — it's app content):

- `meta.json` — book + chapter registry
- `chapters/{id}.txt` — cleaned essay text
- `tokens/{id}.json` — token arrays `[{t, w}]` (surface text + gloss key)
- `glosses/{id}.json` — per-chapter gloss libraries
- `glosses.json` — merged library (all keys)

Regenerate/update glosses (resumable, incremental — the model is **user-supplied**, never defaulted):

```bash
node astro/scripts/gloss.mjs --model <model-name>
```

## Deployment

Cloudflare Pages (project `learn-words`):

```bash
cd astro && npm run build
wrangler pages deploy astro/dist --project-name learn-words
```

## Roadmap (not yet built)

- Dark theme
- Known-words tracking, TTS audio, SRS — later phases

---

Made by [CTDev](https://ctdev.dev/)
