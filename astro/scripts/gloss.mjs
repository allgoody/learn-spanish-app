import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { tokenize } from "./lib/tokenize.mjs";
import {
  parseBatchResponse,
  mergeGlosses,
  pendingKeys,
} from "./lib/gloss-parse.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    throw new Error(`cannot read ${path}: ${e.message}`);
  }
}

function parseArgs(argv) {
  const args = {
    model: process.env.GLOSS_MODEL || null,
    ollamaUrl: "http://localhost:11434",
    batchSize: 50,
    think: null,
    timeoutMs: 120000,
    limit: null,
    dataDir: join(ROOT, "src/data/books/andanzas"),
    phrases: join(ROOT, "scripts/data/phrases.json"),
  };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--model") args.model = argv[++i];
    if (argv[i] === "--ollama-url") args.ollamaUrl = argv[++i];
    if (argv[i] === "--batch-size") args.batchSize = parseInt(argv[++i], 10);
    if (argv[i] === "--think") args.think = argv[++i];
    if (argv[i] === "--timeout") args.timeoutMs = parseInt(argv[++i], 10);
    if (argv[i] === "--limit") args.limit = parseInt(argv[++i], 10);
    if (argv[i] === "--data-dir") args.dataDir = argv[++i];
    if (argv[i] === "--phrases") args.phrases = argv[++i];
  }
  return args;
}

const SYSTEM_PROMPT =
  "You are a Spanish linguist creating learner glosses for a Russian-speaking student. Respond ONLY with a JSON array. No prose, no markdown.";

function buildUserPrompt(entries) {
  const lines = entries.map((e, i) => {
    const ctx = e.contexts.map((c) => `"${c}"`).join(" / ");
    return `${i + 1}. ${e.key} — ${ctx}`;
  });
  return `Gloss each Spanish word form for a Russian learner. For each item output exactly: {"word": string, "lemma": string, "pos": string, "ipa": string, "ru": string, "grammar": string|null, "cefr": string|null, "modern": string|null, "false_friend": string|null, "note": string|null}. pos is one of: verb, noun, adj, adv, pron, prep, conj, interj, name, num, other. ipa is a broad IPA transcription. ru is the Russian translation. grammar explains THIS surface form (e.g. "pretérito imperfecto, 1ª/3ª pers. sing." for a verb, "sustantivo masculino, plural" for a noun) or null. cefr is A1, A2, B1, B2, C1 or C2, or null. modern is the modern Spanish equivalent if the word is archaic, else null. false_friend is a warning if the word is a false friend for Russian speakers, else null. note is a short usage note if useful, else null.\n\nWords with context sentences (multiple contexts for one word are separated by " / "):\n${lines.join("\n")}`;
}

async function chatOnce(cfg, entries) {
  const body = {
    model: cfg.model,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserPrompt(entries) },
    ],
    stream: false,
    format: "json",
  };
  if (cfg.think) body.think = cfg.think;
  const res = await fetch(`${cfg.ollamaUrl}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(cfg.timeoutMs),
  });
  if (!res.ok) throw new Error(`ollama HTTP ${res.status}`);
  const data = await res.json();
  return data.message.content;
}

async function glossBatch(cfg, entries) {
  // network retry: up to 3 attempts, 5s backoff
  let content = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      content = await chatOnce(cfg, entries);
      break;
    } catch (e) {
      if (attempt === 3) throw e;
      console.log(
        `  network error (${e.message}), retry ${attempt}/3 in 5s...`,
      );
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
  const keys = entries.map((e) => e.key);
  const parsed = parseBatchResponse(content, keys);
  const missing = keys.filter((k) => !(k in parsed));
  if (missing.length > 0) {
    console.log(`  ${missing.length} missing, retrying batch once in 3s...`);
    await new Promise((r) => setTimeout(r, 3000));
    const retry = await chatOnce(cfg, entries);
    const reparsed = parseBatchResponse(retry, keys);
    mergeGlosses(parsed, reparsed);
  }
  return parsed;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.model) {
    console.error(
      "ERROR: no model specified — pass --model <name> or set GLOSS_MODEL",
    );
    process.exit(1);
  }

  const cfg = {
    ollamaUrl: args.ollamaUrl,
    model: args.model,
    think: args.think,
    timeoutMs: args.timeoutMs,
  };

  const meta = readJson(join(args.dataDir, "meta.json"));
  const phrases = readJson(args.phrases);

  // 1-2. Tokenize every chapter
  const chapterTokens = {};
  for (const ch of meta.chapters) {
    const text = readFileSync(
      join(args.dataDir, "chapters", `${ch.id}.txt`),
      "utf8",
    );
    chapterTokens[ch.id] = tokenize(text, phrases);
  }

  // 3. Distinct keys in order of first appearance, with up to 3 context sentences
  const keyOrder = [];
  const contexts = new Map();
  for (const ch of meta.chapters) {
    const text = readFileSync(
      join(args.dataDir, "chapters", `${ch.id}.txt`),
      "utf8",
    );
    for (const tok of chapterTokens[ch.id]) {
      if (tok.w === null) continue;
      if (!contexts.has(tok.w)) {
        contexts.set(tok.w, []);
        keyOrder.push(tok.w);
      }
      const ctxs = contexts.get(tok.w);
      if (ctxs.length >= 3) continue;
      // locate occurrences by case-insensitive indexOf
      let from = 0;
      while (ctxs.length < 3) {
        const idx = text.toLowerCase().indexOf(tok.w, from);
        if (idx === -1) break;
        const ctx = text
          .slice(idx, idx + 200)
          .replace(/\n/g, " ")
          .trim();
        if (!ctxs.includes(ctx)) ctxs.push(ctx);
        from = idx + tok.w.length;
      }
    }
  }

  // 4. Defensive: skip pure-digit keys
  const keys = keyOrder.filter((k) => !/^\d+$/.test(k));

  // 5. Resume from existing glosses.json
  const glossesPath = join(args.dataDir, "glosses.json");
  const glosses = existsSync(glossesPath) ? readJson(glossesPath) : {};
  const todo = pendingKeys(keys, glosses).slice(
    0,
    args.limit === null ? undefined : args.limit,
  );
  const failed = [];

  // 6-10. Batch gloss
  const batches = [];
  for (let i = 0; i < todo.length; i += args.batchSize) {
    batches.push(todo.slice(i, i + args.batchSize));
  }
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const entries = batch.map((key) => ({
      key,
      contexts: contexts.get(key) || [],
    }));
    console.log(
      `batch ${i + 1}/${batches.length} — glossed so far: ${Object.keys(glosses).length}`,
    );
    try {
      const parsed = await glossBatch(cfg, entries);
      mergeGlosses(glosses, parsed);
      for (const k of batch) if (!(k in glosses)) failed.push(k);
    } catch (e) {
      console.log(`  batch failed: ${e.message}`);
      failed.push(...batch);
    }
    writeFileSync(glossesPath, JSON.stringify(glosses, null, 2) + "\n");
  }

  // 11. Per-chapter tokens + glosses, final merged glosses.json
  mkdirSync(join(args.dataDir, "tokens"), { recursive: true });
  mkdirSync(join(args.dataDir, "glosses"), { recursive: true });
  for (const ch of meta.chapters) {
    writeFileSync(
      join(args.dataDir, "tokens", `${ch.id}.json`),
      JSON.stringify(chapterTokens[ch.id], null, 2) + "\n",
    );
    const chapterKeys = new Set(
      chapterTokens[ch.id].filter((t) => t.w !== null).map((t) => t.w),
    );
    const chapterGlosses = {};
    for (const k of chapterKeys)
      if (k in glosses) chapterGlosses[k] = glosses[k];
    writeFileSync(
      join(args.dataDir, "glosses", `${ch.id}.json`),
      JSON.stringify(chapterGlosses, null, 2) + "\n",
    );
  }
  writeFileSync(glossesPath, JSON.stringify(glosses, null, 2) + "\n");

  // Report
  const coverage = keys.length
    ? ((keys.length - failed.length) / keys.length) * 100
    : 100;
  console.log(`Distinct keys: ${keys.length}`);
  console.log(`Glossed: ${keys.length - failed.length}`);
  console.log(`Failed: ${failed.length}`);
  console.log(`Coverage: ${coverage.toFixed(1)}%`);
  for (const k of failed) console.log(k);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
