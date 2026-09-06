# Phase 2: Tokenize + Gloss (ollama)

## Objective

Run the existing gloss pipeline on the selva book: tokenize all 8 chapters,
batch-gloss every distinct word form via ollama + `deepseek-v4-flash:0731-cloud`,
and produce `tokens/`, `glosses/`, and `glosses.json`. This is the long job
(~3–10 min) — report batch progress live in chat.

## Prerequisites

- Phase 1 complete: `astro/src/data/books/selva/meta.json` + 8 chapter files exist
- ollama running locally at `http://localhost:11434` (the user's proxy for
  `deepseek-v4-flash:0731-cloud`)

## Shared Context

`astro/scripts/gloss.mjs` is generic: `--data-dir` points at a book dir, and
it reads that dir's `meta.json`, tokenizes every chapter (using
`astro/scripts/data/phrases.json`), collects distinct word forms with up to 3
context sentences each, and batch-glosses them (50 per batch) via
`POST {ollamaUrl}/api/chat` with `format: "json"`. It writes `glosses.json`
incrementally after EVERY batch (resumable), then writes `tokens/{id}.json`
and `glosses/{id}.json` per chapter. Missing keys after a batch are retried
once; keys that still fail are logged and skipped — re-running the script
resumes from `glosses.json` and only processes the remaining keys.

The script resolves `ROOT = astro/` and joins `--data-dir` against it, so
pass the path relative to `astro/`: `src/data/books/selva`.

## Work Packages

### WP-5: Verify ollama, then run the gloss pipeline

**Context:**
The gloss model is user-supplied and must NOT be defaulted. The user's model
is `deepseek-v4-flash:0731-cloud` (verified working via the ollama proxy —
`api/tags` may not list it, that is expected; the chat endpoint accepts it).
The known-good connectivity check is a tiny chat call.

**Task:**

1. Verify the model responds:
   `curl -m 30 http://localhost:11434/api/chat -d '{"model":"deepseek-v4-flash:0731-cloud","messages":[{"role":"user","content":"hi"}],"stream":false}'`
   → expect a JSON response containing `"message":{"content":...}`.
   If this fails (connection refused, model not found, timeout), STOP and
   report — do not substitute a different model.
2. Run the pipeline from the repo root:
   `node astro/scripts/gloss.mjs --model deepseek-v4-flash:0731-cloud --data-dir src/data/books/selva`
3. Report progress live: after each batch log line, post a short chat update
   (e.g. "batch 12/47 — 600 glossed"). Do not wait silently.
4. If the run ends with failed keys (the script logs them), re-run the exact
   same command — it resumes from `glosses.json`. Repeat until a run completes
   with no failed keys.

**Files:**

- `astro/src/data/books/selva/tokens/*.json` — CREATE (8 files, by gloss.mjs)
- `astro/src/data/books/selva/glosses/*.json` — CREATE (8 files, by gloss.mjs)
- `astro/src/data/books/selva/glosses.json` — CREATE (by gloss.mjs)

**Constraints:**

- DO: use the exact model name `deepseek-v4-flash:0731-cloud`
- DO: run from the repo root — do not `cd` into `astro/`
- DO: re-run until no failed keys (the pipeline is designed to resume)
- DO NOT: edit `glosses.json` by hand
- DO NOT: change batch size or any other flag

**Success:**

- [ ] Curl check returns a JSON body with `"message"` (exit 0)
- [ ] `node astro/scripts/gloss.mjs ...` exits 0
- [ ] `ls astro/src/data/books/selva/tokens/ | wc -l` → 8
- [ ] `ls astro/src/data/books/selva/glosses/ | wc -l` → 8
- [ ] `test -f astro/src/data/books/selva/glosses.json` → exit 0
- [ ] The final run's log shows no failed keys (or a re-run cleared them)

### WP-6: Verify gloss coverage

**Context:**
WP-5 produced `glosses.json` (full library) and per-chapter `tokens/` files.
The invariant that matters: every distinct token key in every chapter has a
gloss entry. Write a small scratch script to `.tmp/` (project rule: scratch
files live in `.tmp/` under the repo root, never system `/tmp`) and run it.

**Task:**
Create `.tmp/check-selva-coverage.mjs` that:

1. Reads `astro/src/data/books/selva/meta.json`.
2. For each chapter, reads `astro/src/data/books/selva/tokens/{id}.json`
   (array of `{t, w}`) and collects every `w` that is not null.
3. Reads `astro/src/data/books/selva/glosses.json` (a flat object).
4. Prints the total distinct key count and the list of missing keys
   (keys with no gloss entry).
5. Exits 1 if any key is missing, else exits 0.

Run it: `node .tmp/check-selva-coverage.mjs`.

**Files:**

- `.tmp/check-selva-coverage.mjs` — CREATE — coverage check (scratch, gitignored)

**Constraints:**

- DO: write the script to `.tmp/` and run it from the repo root
- DO: if keys are missing, re-run the WP-5 command (it resumes) and re-check
- DO NOT: hand-edit glosses.json to "fix" coverage
- DO NOT: delete `.tmp/` after use — it persists for the session

**Success:**

- [ ] `node .tmp/check-selva-coverage.mjs` → exit 0, prints `missing: 0` (or an empty list)
- [ ] Spot-check a gloss entry is well-formed:
      `node -e "const g=require('./astro/src/data/books/selva/glosses.json'); console.log(JSON.stringify(g['tortuga'], null, 2))"`
      → object with non-empty `ru` and `lemma` (values are model-generated, so
      exact strings may vary — `ru` and `lemma` must be non-empty strings)

## Phase Verification

After all work packages are complete, run:

```bash
node .tmp/check-selva-coverage.mjs
```

- [ ] Coverage check exits 0 (every token key glossed)
- [ ] `tokens/`, `glosses/`, `glosses.json` all present under `astro/src/data/books/selva/`
- [ ] Spot-checked glosses have non-empty `ru` and `lemma`
