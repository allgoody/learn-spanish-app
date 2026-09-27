import { describe, it, expect } from "vitest";
import prepositionsJson from "../../../src/data/words/prepositions.json";
import type { WordCategory } from "../../../src/lib/types";

const cat = prepositionsJson as unknown as WordCategory;
const groupTitles = [
  "Простые предлоги",
  "Предложные обороты места и направления",
  "Предложные обороты времени",
  "Предложные обороты причины, цели и условия",
  "Предложные обороты замены, отношения и средства",
];

describe("prepositions category data shape", () => {
  const entries = cat.groups.flatMap((g) => g.items);

  it("has the expected metadata and groups", () => {
    expect(cat.id).toBe("prepositions");
    expect(cat.lang).toBe("es");
    expect(cat.title.ru.trim()).toBeTruthy();
    expect(cat.title.en.trim()).toBeTruthy();
    expect(cat.groups.map((g) => g.title)).toEqual(groupTitles);
    for (const group of cat.groups) {
      expect(group.items.length, `group ${group.title}`).toBeGreaterThan(0);
    }
  });

  it("has 90–115 entries", () => {
    expect(entries.length).toBeGreaterThanOrEqual(90);
    expect(entries.length).toBeLessThanOrEqual(115);
  });

  it("every entry has es, pos, ru, ipa and a bilingual example", () => {
    for (const entry of entries) {
      expect(entry.es, `entry ${entry.es}`).toBeTruthy();
      expect(entry.pos, `entry ${entry.es}`).toBeTruthy();
      expect(entry.ru, `entry ${entry.es}`).toBeTruthy();
      expect(entry.ipa, `entry ${entry.es}`).toBeTruthy();
      expect(entry.example?.es, `entry ${entry.es}`).toBeTruthy();
      expect(entry.example?.ru, `entry ${entry.es}`).toBeTruthy();
    }
  });

  it("es keys are unique within each group", () => {
    for (const group of cat.groups) {
      const keys = group.items.map((item) => item.es);
      expect(new Set(keys).size, `group ${group.title}`).toBe(keys.length);
    }
  });

  it("every group has a non-empty title", () => {
    for (const group of cat.groups) {
      expect(group.title.trim(), `group ${group.title}`).toBeTruthy();
    }
  });
});
