import { describe, it, expect } from "vitest";
import { categories } from "../../../src/lib/words";

const expectedIds = [
  "pronouns",
  "core-verbs",
  "prepositions",
  "conjunctions",
  "adverbs",
  "numbers",
  "interjections",
  "frequency",
];

describe("words registry invariants", () => {
  it("registers the eight categories in the contracted display order", () => {
    expect(categories.map((c) => c.id)).toEqual(expectedIds);
  });

  it("keeps pronouns first (WordLesson and Chooser depend on it)", () => {
    expect(categories[0].id).toBe("pronouns");
  });

  it("has unique ids and unique, non-empty titles", () => {
    const ids = categories.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    const ruTitles = categories.map((c) => c.title.ru);
    expect(new Set(ruTitles).size).toBe(ruTitles.length);
    for (const category of categories) {
      expect(category.title.ru.trim(), category.id).toBeTruthy();
      expect(category.title.en.trim(), category.id).toBeTruthy();
    }
  });

  it("every category is Spanish", () => {
    for (const category of categories) {
      expect(category.lang, category.id).toBe("es");
    }
  });

  it("every category has titled, non-empty groups", () => {
    for (const category of categories) {
      expect(category.groups.length, category.id).toBeGreaterThan(0);
      for (const group of category.groups) {
        expect(group.title.trim(), `${category.id}: ${group.title}`).toBeTruthy();
        expect(group.items.length, group.title).toBeGreaterThan(0);
      }
    }
  });

  it("every entry is well-formed", () => {
    for (const category of categories) {
      for (const entry of category.groups.flatMap((g) => g.items)) {
        expect(entry.es, `${category.id}: ${entry.es}`).toBeTruthy();
        expect(entry.pos, `${category.id}: ${entry.es}`).toBeTruthy();
        expect(entry.ru, `${category.id}: ${entry.es}`).toBeTruthy();
      }
    }
  });

  it("es keys are unique within every group", () => {
    for (const category of categories) {
      for (const group of category.groups) {
        const keys = group.items.map((item) => item.es);
        expect(new Set(keys).size, `${category.id}: ${group.title}`).toBe(
          keys.length,
        );
      }
    }
  });

  it("has 700–900 entries across all categories", () => {
    const total = categories.reduce(
      (n, category) =>
        n + category.groups.reduce((m, group) => m + group.items.length, 0),
      0,
    );
    expect(total).toBeGreaterThanOrEqual(700);
    expect(total).toBeLessThanOrEqual(900);
  });
});
