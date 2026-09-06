import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import meta from "../../../src/data/books/selva/meta.json";

const REL = "../../../src/data/books/selva/";
const DATA = fileURLToPath(new URL(REL, import.meta.url));

const EXPECTED_SLUGS = [
  "la-tortuga-gigante",
  "las-medias-de-los-flamencos",
  "el-loro-pelado",
  "la-guerra-de-los-yacares",
  "la-gama-ciega",
  "historia-de-dos-cachorros-de-coati-y-de-dos-cachorros-de-hombre",
  "el-paso-del-yabebiri",
  "la-abeja-haragana",
];

describe("selva book data shape", () => {
  it("is the selva book: 8 chapters, es, Quiroga", () => {
    expect(meta.id).toBe("selva");
    expect(meta.lang).toBe("es");
    expect(meta.title).toBe("Cuentos de la selva");
    expect(meta.author).toBe("Horacio Quiroga");
    expect(meta.source).toBeTruthy();
    expect(meta.chapters).toHaveLength(8);
  });

  it("chapter ids match the expected slugs in order", () => {
    expect(meta.chapters.map((c) => c.id)).toEqual(EXPECTED_SLUGS);
  });

  it("every chapter file exists, is non-empty, and is 300-8000 words", () => {
    for (const c of meta.chapters) {
      const text = readFileSync(`${DATA}chapters/${c.id}.txt`, "utf8");
      expect(text.trim().length, `chapter ${c.id}`).toBeGreaterThan(0);
      const words = text.split(/\s+/).filter(Boolean).length;
      expect(words, `chapter ${c.id}`).toBeGreaterThanOrEqual(300);
      expect(words, `chapter ${c.id}`).toBeLessThanOrEqual(8000);
    }
  });

  it("every chapter has tokens and glosses files", () => {
    for (const c of meta.chapters) {
      const tokens = JSON.parse(
        readFileSync(`${DATA}tokens/${c.id}.json`, "utf8"),
      );
      const glosses = JSON.parse(
        readFileSync(`${DATA}glosses/${c.id}.json`, "utf8"),
      );
      expect(Array.isArray(tokens), `tokens ${c.id}`).toBe(true);
      expect(tokens.length, `tokens ${c.id}`).toBeGreaterThan(0);
      expect(typeof glosses, `glosses ${c.id}`).toBe("object");
    }
  });

  it("every distinct token key has a gloss in glosses.json", () => {
    const glosses = JSON.parse(
      readFileSync(`${DATA}glosses.json`, "utf8"),
    ) as Record<string, unknown>;
    const missing = new Set<string>();
    for (const c of meta.chapters) {
      const tokens = JSON.parse(
        readFileSync(`${DATA}tokens/${c.id}.json`, "utf8"),
      ) as { t: string; w: string | null }[];
      for (const tok of tokens) {
        if (tok.w && !(tok.w in glosses)) missing.add(tok.w);
      }
    }
    expect([...missing]).toEqual([]);
  });

  it("glosses 'tortuga' with a Russian translation and lemma", () => {
    const glosses = JSON.parse(
      readFileSync(`${DATA}glosses.json`, "utf8"),
    ) as Record<string, { ru?: string; lemma?: string }>;
    const g = glosses["tortuga"];
    expect(g).toBeTruthy();
    expect(g.ru?.trim()).toBeTruthy();
    expect(g.lemma?.trim()).toBeTruthy();
  });
});
