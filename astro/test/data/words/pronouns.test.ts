import { describe, it, expect } from "vitest";
import { categories } from "../../../src/lib/words";

describe("pronouns category data shape", () => {
  const pronouns = categories.find((c) => c.id === "pronouns");
  if (!pronouns)
    throw new Error("pronouns category missing from src/lib/words");

  const entries = pronouns.groups.flatMap((g) => g.items);

  it("is the pronouns category: 9 groups, 69 entries", () => {
    expect(pronouns.id).toBe("pronouns");
    expect(pronouns.lang).toBe("es");
    expect(pronouns.title.ru).toBe("Местоимения");
    expect(pronouns.groups).toHaveLength(9);
    expect(entries).toHaveLength(69);
  });

  it("every entry has es, pos, ru, ipa, and a bilingual example", () => {
    for (const e of entries) {
      expect(e.es, `entry ${e.es}`).toBeTruthy();
      expect(e.pos, `entry ${e.es}`).toBeTruthy();
      expect(e.ru, `entry ${e.es}`).toBeTruthy();
      expect(e.ipa, `entry ${e.es}`).toBeTruthy();
      expect(e.example?.es, `entry ${e.es}`).toBeTruthy();
      expect(e.example?.ru, `entry ${e.es}`).toBeTruthy();
    }
  });

  it("es keys are unique within each group (React list keys)", () => {
    for (const g of pronouns.groups) {
      const keys = g.items.map((i) => i.es);
      expect(new Set(keys).size, `group ${g.title}`).toBe(keys.length);
    }
  });

  it("every group has a non-empty title", () => {
    for (const g of pronouns.groups) {
      expect(g.title.trim(), `group ${g.title}`).toBeTruthy();
    }
  });
});
