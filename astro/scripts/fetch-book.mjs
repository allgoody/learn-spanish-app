import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

function parseArgs(argv) {
  const args = {
    input: join(ROOT, "../.tmp/pg78052.txt"),
    output: join(ROOT, "src/data/books/andanzas"),
  };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--input") args.input = argv[++i];
    if (argv[i] === "--output") args.output = argv[++i];
  }
  return args;
}

function slugify(title) {
  const map = { á: "a", é: "e", í: "i", ó: "o", ú: "u", ü: "u", ñ: "n" };
  const lower = title.toLowerCase().replace(/[áéíóúüñ]/g, (c) => map[c]);
  return lower.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

async function main() {
  const { input, output } = parseArgs(process.argv.slice(2));

  if (!existsSync(input)) {
    console.log(`Downloading ${input} ...`);
    const res = await fetch(
      "https://www.gutenberg.org/cache/epub/78052/pg78052.txt",
    );
    if (!res.ok) throw new Error(`download failed: ${res.status}`);
    writeFileSync(input, await res.text());
  }

  const lines = readFileSync(input, "utf8").split("\n");

  // 2. Slice between START and END markers (exclusive)
  const startIdx = lines.findIndex((l) =>
    l.includes("*** START OF THE PROJECT GUTENBERG EBOOK"),
  );
  const endIdx = lines.findIndex((l) =>
    l.includes("*** END OF THE PROJECT GUTENBERG EBOOK"),
  );
  if (startIdx === -1 || endIdx === -1)
    throw new Error("START/END markers not found");
  const body = lines.slice(startIdx + 1, endIdx);

  // 3. Discard front matter before ÍNDICE
  const indiceIdx = body.findIndex((l) => l.trim() === "ÍNDICE");
  if (indiceIdx === -1) throw new Error("ÍNDICE not found");
  const afterIndice = body.slice(indiceIdx + 1);

  // 4. Body start = first line after ÍNDICE whose trimmed content is exactly PRÓLOGO
  const bodyStart = afterIndice.findIndex((l) => l.trim() === "PRÓLOGO");
  if (bodyStart === -1) throw new Error("body start PRÓLOGO not found");
  const indexLines = afterIndice.slice(0, bodyStart);
  const bodyLines = afterIndice.slice(bodyStart);

  // 5. Index titles
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

  // 6. Split body into sections
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
  for (let i = 0; i < bodyLines.length; i++) {
    const trimmed = bodyLines[i].trim();
    const nextTrimmed = (bodyLines[i + 1] || "").trim();
    if (currentTitle === null && trimmed === "PRÓLOGO") {
      pushSection("Prólogo");
      if (
        nextTitleIdx < titles.length &&
        titles[nextTitleIdx].toLowerCase() === "prólogo"
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
      currentRaw.push(bodyLines[i]);
    }
  }
  if (currentTitle !== null)
    sections.push({ title: currentTitle, raw: currentRaw });
  for (const t of titles) {
    if (!sections.some((s) => s.title === t))
      console.log(`WARNING: section not found: ${t}`);
  }

  // 7. Clean each section
  const clean = (raw) => {
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
  };

  // 8-10. Write meta.json + chapters
  mkdirSync(join(output, "chapters"), { recursive: true });
  const chapters = sections.map((s) => ({
    id: slugify(s.title),
    title: s.title,
  }));
  const meta = {
    id: "andanzas",
    title: "Andanzas y visiones españolas",
    author: "Miguel de Unamuno",
    source: "Project Gutenberg #78052",
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
