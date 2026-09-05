# Phase 3: Gloss Pipeline

## Objective

Build the LLM gloss pipeline: seed phrase list, tokenize all chapters, dedupe word forms, batch-gloss via the ollama API with a user-supplied model (NEVER defaulted), and write per-chapter token + gloss libraries. Then run it with the model the user chooses and verify coverage.

## Prerequisites

- Phase 2 complete (chapters + tokenizer + tests pass)
- Ollama API reachable: `curl -s http://localhost:11434/api/tags` returns JSON (verified this session)
- **The user must provide the model name at WP-7. Do not pick one.**

## Shared Context

See Global Context in `_index.md`. The ollama chat endpoint is `POST http://localhost:11434/api/chat` with body `{ model, messages, stream: false, format: "json" }` — `format: "json"` makes the model return a JSON object. Response shape: `{ message: { content: "<json string>" } }`.

## Work Packages

### WP-6: Seed phrases + gloss pipeline script

**Context:**
`scripts/lib/tokenize.mjs` exports `tokenize(text, phrases)`. Chapters are at `src/data/books/andanzas/chapters/{id}.txt`, meta at `src/data/books/andanzas/meta.json`. The gloss schema is in `src/lib/types.ts` (Gloss interface). The user will supply the model at run time — the script must fail cleanly without one.

**Task:**
Create the seed phrase list and the gloss pipeline script `scripts/gloss.mjs` that tokenizes all chapters, collects distinct gloss keys with context sentences, glosses them in batches via the ollama API, retries failures, and writes per-chapter tokens + glosses + merged glosses.json with a coverage report.

**Files:**

- `astro/scripts/data/phrases.json` — CREATE
- `astro/scripts/gloss.mjs` — CREATE

**Constraints:**

- DO: `phrases.json` — a JSON array of exactly these 40 phrases (lowercase, in this order):
  `["a pesar de","a través de","de repente","de pronto","sin embargo","desde luego","por supuesto","poco a poco","de vez en cuando","de cuando en cuando","por fin","al fin y al cabo","en seguida","por lo tanto","en cambio","por ejemplo","a lo largo de","en medio de","alrededor de","cerca de","lejos de","junto a","frente a","gracias a","en vez de","en lugar de","a causa de","por lo menos","al menos","de todas maneras","de todos modos","en efecto","por otra parte","además de","a la vez","en cuanto a","por último","en primer lugar","a menudo","en torno a"]`
- DO: `gloss.mjs` CLI: `--model <name>` (REQUIRED — no default), `--ollama-url` (default `http://localhost:11434`), `--batch-size` (default 50), `--data-dir` (default `src/data/books/andanzas`), `--phrases` (default `scripts/data/phrases.json`). Env fallback: `GLOSS_MODEL`. If neither `--model` nor `GLOSS_MODEL` is set → print `ERROR: no model specified — pass --model <name> or set GLOSS_MODEL` and `process.exit(1)`.
- DO: pipeline steps:
  1. Load meta.json, all chapters, phrases.
  2. Tokenize every chapter with `tokenize(text, phrases)`.
  3. Collect distinct keys (tokens with `w !== null`) in order of first appearance; for each key store the first context sentence: the chapter text from the token's position, trimmed to 200 chars, with newlines replaced by spaces.
  4. Skip keys matching `/^\d+$/` (shouldn't exist — tokenizer already nulls them; defensive).
  5. Load existing `glosses.json` if present → resume (skip keys already glossed).
  6. Batch remaining keys (batch-size per request). For each batch: POST to `{ollama-url}/api/chat` with `{ model, messages: [system, user], stream: false, format: "json" }`, timeout 120s (AbortController). On network error: retry up to 3 times with 5s backoff, then mark all keys in the batch failed.
  7. System prompt (exact): `You are a Spanish linguist creating learner glosses for a Russian-speaking student. Respond ONLY with a JSON array. No prose, no markdown.`
  8. User prompt (exact template): `Gloss each Spanish word form for a Russian learner. For each item output exactly: {"word": string, "lemma": string, "pos": string, "ipa": string, "ru": string, "grammar": string|null, "cefr": string|null, "modern": string|null, "false_friend": string|null, "note": string|null}. pos is one of: verb, noun, adj, adv, pron, prep, conj, interj, name, num, other. ipa is a broad IPA transcription. ru is the Russian translation. grammar explains THIS surface form (e.g. "pretérito imperfecto, 1ª/3ª pers. sing." for a verb, "sustantivo masculino, plural" for a noun) or null. cefr is A1, A2, B1, B2, C1 or C2, or null. modern is the modern Spanish equivalent if the word is archaic, else null. false_friend is a warning if the word is a false friend for Russian speakers, else null. note is a short usage note if useful, else null.\n\nWords with context sentences:\n1. hablaba — "Él hablaba despacio."\n2. <key> — "<context>"\n...`
  9. Parse: `JSON.parse(res.message.content)`; if content is wrapped in ```json fences, strip them first. Expect an array; map items by their `word` field (lowercased) to glosses. Items whose `word` is not in the batch → ignore. Missing items → retry the batch once after 3s; still missing → mark those keys failed.
  10. Write per-chapter `tokens/{id}.json` (the token arrays) and `glosses/{id}.json` (only keys appearing in that chapter, from the merged gloss map), plus merged `glosses.json`.
  11. Print progress per batch (`batch i/N — glossed so far: X`), then the report: `Distinct keys: N`, `Glossed: N`, `Failed: N`, `Coverage: NN.N%`, and the failed keys list (one per line).
- DO: write files with `JSON.stringify(data, null, 2)` + trailing newline.
- DO NOT: hardcode any model name anywhere in the script.
- DO NOT: add a `--dry-run` mode, parallel requests, or rate limiting beyond the retries above.
- DO NOT: modify phrases.json or the tokenizer.

**Success:**

- [ ] `test -f astro/scripts/data/phrases.json && test -f astro/scripts/gloss.mjs` → exit 0
- [ ] `cd astro && node -e "const p=require('./scripts/data/phrases.json'); console.log(p.length)"` → `40`
- [ ] `cd astro && node scripts/gloss.mjs` → exit code 1 AND output contains `ERROR: no model specified`
- [ ] `grep -c "GLOSS_MODEL" astro/scripts/gloss.mjs` → ≥ 1
- [ ] `grep -c 'format: "json"' astro/scripts/gloss.mjs` → ≥ 1
- [ ] `cd astro && npm run build` → exit 0 (script is not part of the build; just confirm nothing broke)

### WP-7: Run the gloss pipeline (user supplies the model)

**Context:**
`scripts/gloss.mjs` is ready. The ollama API is at `http://localhost:11434`. The user explicitly wants to choose the model — the executor must NOT pick one. The book has ~11,700 distinct keys → ~235 batches of 50; with a fast model this takes minutes, with a slow reasoning model it can take much longer. The script is resumable (re-running skips already-glossed keys).

**Task:**
Ask the user which model to use, then run the pipeline with it. If the user provides no model, stop and report — do not proceed.

**Files:**

- `astro/src/data/books/andanzas/tokens/{id}.json` — CREATE (generated, 41 files)
- `astro/src/data/books/andanzas/glosses/{id}.json` — CREATE (generated, 41 files)
- `astro/src/data/books/andanzas/glosses.json` — CREATE (generated)

**Constraints:**

- DO: FIRST ask the user: "Which ollama model should generate the glosses? (e.g. gemini-3-flash-preview:latest, qwq:32b, or any model in `curl -s http://localhost:11434/api/tags`)". Wait for their answer.
- DO: if the user provides a model name, run: `cd astro && node scripts/gloss.mjs --model "<user-model>"`. If the run fails with a model-not-found error from ollama, report it to the user and ask for a different model — do not pick one yourself.
- DO: if the user declines or gives no model → stop, report "gloss generation deferred — user must run: cd astro && node scripts/gloss.mjs --model <name>", and end the plan here (do not proceed to Phase 4).
- DO: if coverage is < 90%, report the failed keys to the user and ask whether to re-run with a different model (the script resumes automatically).
- DO NOT: set GLOSS_MODEL yourself. DO NOT: choose a model. DO NOT: edit glosses.json by hand.

**Success:**

- [ ] `ls astro/src/data/books/andanzas/tokens/ | wc -l` → `41`
- [ ] `ls astro/src/data/books/andanzas/glosses/ | wc -l` → `41`
- [ ] `test -f astro/src/data/books/andanzas/glosses.json` → exit 0
- [ ] The pipeline's printed `Coverage:` is ≥ 90.0%
- [ ] `cd astro && node -e "const g=require('./src/data/books/andanzas/glosses.json'); console.log(Object.keys(g).length)"` → ≥ 10000
- [ ] Spot check: `cd astro && node -e "const g=require('./src/data/books/andanzas/glosses.json'); console.log(JSON.stringify(g['hablaba']||g['hablar'],null,2))"` → prints an object with `ru` and `lemma` fields

## Phase Verification

```bash
cd astro && node scripts/gloss.mjs --model "<user-model>"   # re-run is resumable; should print Coverage ≥ 90%
cd astro && npm run build
```

- [ ] Coverage ≥ 90%
- [ ] Build exits 0
- [ ] Commit: `git add astro/ && git commit -m "spanish-reader: phase 3 — gloss pipeline"`
