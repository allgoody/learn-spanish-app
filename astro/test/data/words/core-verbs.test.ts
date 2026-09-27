import { describe, it, expect } from "vitest";
import coreVerbsJson from "../../../src/data/words/core-verbs.json";
import type { WordCategory } from "../../../src/lib/types";

const cat = coreVerbsJson as unknown as WordCategory;
const groupTitles = [
  "ser — быть (постоянное)",
  "estar — быть, находиться (состояние)",
  "haber — иметь (вспомогательный); hay",
  "tener — иметь",
  "ser vs estar — значение меняется",
  "Устойчивые выражения с tener",
];

describe("core-verbs category data shape", () => {
  const entries = cat.groups.flatMap((g) => g.items);

  it("has the expected metadata and groups", () => {
    expect(cat.id).toBe("core-verbs");
    expect(cat.lang).toBe("es");
    expect(cat.title.ru.trim()).toBeTruthy();
    expect(cat.title.en.trim()).toBeTruthy();
    expect(cat.groups.map((g) => g.title)).toEqual(groupTitles);
    for (const group of cat.groups) {
      expect(group.items.length, `group ${group.title}`).toBeGreaterThan(0);
    }
  });

  it("has 44–52 entries", () => {
    expect(entries.length).toBeGreaterThanOrEqual(44);
    expect(entries.length).toBeLessThanOrEqual(52);
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
