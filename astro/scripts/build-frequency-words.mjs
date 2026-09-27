// Regenerate src/data/words/frequency.json from the committed book glosses and
// token streams. Run from `astro/`: `node scripts/build-frequency-words.mjs`.
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  countLemmaFrequency,
  buildFrequencyCategory,
} from "./lib/frequency.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    throw new Error(`cannot read ${path}: ${e.message}`);
  }
}

const booksDir = join(ROOT, "src/data/books");
const books = [];
for (const id of readdirSync(booksDir).sort()) {
  const dir = join(booksDir, id);
  const glossesPath = join(dir, "glosses.json");
  const tokensDir = join(dir, "tokens");
  if (!existsSync(glossesPath) || !existsSync(tokensDir)) continue;

  const tokens = [];
  for (const file of readdirSync(tokensDir).sort()) {
    if (!file.endsWith(".json")) continue;
    tokens.push(...readJson(join(tokensDir, file)));
  }
  books.push({ id, glosses: readJson(glossesPath), tokens });
}

const freq = countLemmaFrequency(books);
const category = buildFrequencyCategory(freq);
const entries = category.groups.reduce((n, g) => n + g.items.length, 0);

writeFileSync(
  join(ROOT, "src/data/words/frequency.json"),
  JSON.stringify(category, null, 2) + "\n",
  "utf8",
);

console.log(
  `frequency: ${books.length} books, ${freq.size} lemmas, ${category.groups.length} groups, ${entries} entries`,
);
