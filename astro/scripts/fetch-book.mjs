import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const REPO = join(ROOT, "..");

function parseArgs(argv) {
  const args = { config: join(ROOT, "scripts/data/gutenberg/andanzas.json") };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--config") args.config = argv[++i];
  }
  return args;
}

function slugify(title) {
  const map = { á: "a", é: "e", í: "i", ó: "o", ú: "u", ü: "u", ñ: "n" };
  const lower = title.toLowerCase().replace(/[áéíóúüñ]/g, (c) => map[c]);
  return lower.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

// Strip Gutenberg markup and trailing spaces; keep paragraph breaks.
function clean(raw) {
  let text = raw.join("\n");
  text = text.replace(/_([^_]+)_/g, "$1").replace(/=([^=]+)=/g, "$1");
  text = text.replace(/\n{3,}/g, "\n\n");
  text = text
    .split("\n")
    .map((l) => l.replace(/\s+$/, ""))
    .join("\n");
  text = text.replace(/^\n+/, "");
  if (!text.endsWith("\n")) text += "\n";
  return text;
}

// "indice": numbered table of contents at the top, one section per title
// (Andanzas y visiones españolas).
function splitIndice(bodyLines, cfg) {
  const indiceIdx = bodyLines.findIndex((l) => l.trim() === cfg.indice);
  if (indiceIdx === -1) throw new Error(cfg.indice + " not found");
  const afterIndice = bodyLines.slice(indiceIdx + 1);

  const bodyStart = afterIndice.findIndex((l) => l.trim() === cfg.start);
  if (bodyStart === -1) throw new Error("body start " + cfg.start + " not found");
  const indexLines = afterIndice.slice(0, bodyStart);
  const bodyLines2 = afterIndice.slice(bodyStart);

  const titles = [];
  let pending = null;
  for (const raw of indexLines) {
    const line = raw.trim();
    if (!line || line === "Pág.") continue;
    if (/\d$/.test(line)) {
      const title = line.replace(/\d+$/, "").trim();
      titles.push(pending ? `${pending} ${title}` : title);
      pending = null;
    } else {
      pending = pending ? `${pending} ${line}` : line;
    }
  }
  if (pending) titles.push(pending);

  const sections = [];
  let currentTitle = null;
  let currentRaw = [];
  let nextTitleIdx = 0;
  const pushSection = (title) => {
    if (currentTitle !== null)
      sections.push({ title: currentTitle, raw: currentRaw });
    currentTitle = title;
    currentRaw = [];
  };
  for (let i = 0; i < bodyLines2.length; i++) {
    const trimmed = bodyLines2[i].trim();
    const nextTrimmed = (bodyLines2[i + 1] || "").trim();
    if (currentTitle === null && trimmed === cfg.start) {
      pushSection(cfg.startTitle);
      if (
        nextTitleIdx < titles.length &&
        titles[nextTitleIdx].toLowerCase() === cfg.startTitle.toLowerCase()
      )
        nextTitleIdx++;
    } else if (
      nextTitleIdx < titles.length &&
      trimmed.toLowerCase() === titles[nextTitleIdx].toLowerCase()
    ) {
      pushSection(titles[nextTitleIdx]);
      nextTitleIdx++;
    } else if (
      nextTitleIdx < titles.length &&
      `${trimmed} ${nextTrimmed}`.toLowerCase() ===
        titles[nextTitleIdx].toLowerCase()
    ) {
      pushSection(titles[nextTitleIdx]);
      nextTitleIdx++;
      i++; // skip the next line (two-line title)
    } else {
      currentRaw.push(bodyLines2[i]);
    }
  }
  if (currentTitle !== null)
    sections.push({ title: currentTitle, raw: currentRaw });
  for (const t of titles) {
    if (!sections.some((s) => s.title === t))
      console.log(`WARNING: section not found: ${t}`);
  }
  return sections;
}

// "roman": a preface plus chapters marked by bare roman numerals, ending at the
// FIN colophon, then dropped publisher pages (La Barraca).
function splitRoman(bodyLines, cfg) {
  const from = bodyLines.findIndex((l) => l.trim() === cfg.start);
  const to = bodyLines.findIndex((l) => l.trim() === cfg.end);
  if (from === -1) throw new Error(cfg.start + " not found");
  if (to === -1) throw new Error(cfg.end + " not found");
  const range = bodyLines.slice(from + 1, to); // heading line itself is dropped

  const sections = [];
  let cur = { title: cfg.startTitle, raw: [] };
  for (const line of range) {
    const trimmed = line.trim();
    if (/^[IVXLC]+$/.test(trimmed)) {
      sections.push(cur);
      cur = { title: `${cfg.numberTitle} ${trimmed}`, raw: [] };
      continue;
    }
    // the novel's title page repeats the book title right before chapter I
    if (trimmed === cfg.title.toUpperCase()) continue;
    cur.raw.push(line);
  }
  sections.push(cur);
  return sections;
}

async function main() {
  const { config } = parseArgs(process.argv.slice(2));
  let cfg;
  try {
    cfg = JSON.parse(readFileSync(config, "utf8"));
  } catch (e) {
    throw new Error("cannot read config " + config + ": " + e.message);
  }
  const input = join(REPO, cfg.input);
  const output = join(REPO, cfg.output);

  if (!existsSync(input)) {
    const url = `https://www.gutenberg.org/cache/epub/${cfg.gutenbergId}/pg${cfg.gutenbergId}.txt`;
    console.log(`Downloading ${url} ...`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`download failed: ${res.status}`);
    writeFileSync(input, await res.text());
  }

  const lines = readFileSync(input, "utf8").split("\n");
  const startIdx = lines.findIndex((l) =>
    l.includes("*** START OF THE PROJECT GUTENBERG EBOOK"),
  );
  const endIdx = lines.findIndex((l) =>
    l.includes("*** END OF THE PROJECT GUTENBERG EBOOK"),
  );
  if (startIdx === -1 || endIdx === -1)
    throw new Error("START/END markers not found");
  const body = lines.slice(startIdx + 1, endIdx);

  const sections =
    cfg.mode === "roman" ? splitRoman(body, cfg) : splitIndice(body, cfg);

  mkdirSync(join(output, "chapters"), { recursive: true });
  const chapters = sections.map((s) => ({
    id: slugify(s.title),
    title: s.title,
  }));
  const meta = {
    id: cfg.id,
    lang: cfg.lang,
    title: cfg.title,
    author: cfg.author,
    source: cfg.source,
    chapters,
  };
  writeFileSync(
    join(output, "meta.json"),
    JSON.stringify(meta, null, 2) + "\n",
  );

  let total = 0;
  sections.forEach((s, i) => {
    const text = clean(s.raw);
    writeFileSync(join(output, "chapters", `${chapters[i].id}.txt`), text);
    const words = text.split(/\s+/).filter(Boolean).length;
    total += words;
    console.log(`${chapters[i].id}: ${words} words`);
  });
  console.log(`Sections: ${sections.length}`);
  console.log(`Total words: ${total}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
