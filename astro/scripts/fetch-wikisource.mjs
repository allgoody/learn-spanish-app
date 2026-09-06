import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { extractStoryText } from "./lib/wikisource-parse.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

function parseArgs(argv) {
  const args = {
    config: join(ROOT, "scripts/data/wikisource/selva.json"),
    output: join(ROOT, "src/data/books/selva"),
  };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--config") args.config = argv[++i];
    if (argv[i] === "--output") args.output = argv[++i];
  }
  return args;
}

function slugify(title) {
  const map = { á: "a", é: "e", í: "i", ó: "o", ú: "u", ü: "u", ñ: "n" };
  const lower = title.toLowerCase().replace(/[áéíóúüñ]/g, (c) => map[c]);
  return lower.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

async function fetchPage(title) {
  const url =
    "https://es.wikisource.org/w/api.php?action=parse&page=" +
    encodeURIComponent(title) +
    "&prop=text&format=json&formatversion=2";
  let res = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      res = await fetch(url, {
        headers: { "user-agent": "learn-spanish-app/1.0 (book fetch script)" },
      });
      break;
    } catch (e) {
      if (attempt === 3) throw e;
      console.log(
        `  network error (${e.message}), retry ${attempt}/3 in 5s...`,
      );
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
  if (!res.ok) throw new Error("HTTP " + res.status + " for " + title);
  const data = await res.json();
  if (!data.parse?.text) throw new Error("no parse.text for " + title);
  return extractStoryText(data.parse.text, title);
}

async function main() {
  const { config, output } = parseArgs(process.argv.slice(2));
  let configData;
  try {
    configData = JSON.parse(readFileSync(config, "utf8"));
  } catch (e) {
    throw new Error("cannot read config " + config + ": " + e.message);
  }

  const texts = [];
  for (const title of configData.pages) {
    console.log(`Fetching ${title} ...`);
    texts.push(await fetchPage(title));
    await new Promise((r) => setTimeout(r, 300));
  }

  const chapters = configData.pages.map((p) => ({
    id: slugify(p),
    title: p,
  }));
  const meta = {
    id: configData.id,
    lang: configData.lang,
    title: configData.title,
    author: configData.author,
    source: configData.source,
    chapters,
  };
  mkdirSync(join(output, "chapters"), { recursive: true });
  writeFileSync(
    join(output, "meta.json"),
    JSON.stringify(meta, null, 2) + "\n",
  );

  let total = 0;
  chapters.forEach((ch, i) => {
    const text = texts[i];
    writeFileSync(join(output, "chapters", `${ch.id}.txt`), text);
    const words = text.split(/\s+/).filter(Boolean).length;
    total += words;
    console.log(`${ch.id}: ${words} words`);
  });
  console.log(`Sections: ${chapters.length}`);
  console.log(`Total words: ${total}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
