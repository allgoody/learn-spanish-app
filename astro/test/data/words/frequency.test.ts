import { describe, it, expect } from "vitest";
import frequencyJson from "../../../src/data/words/frequency.json";
import type { WordCategory } from "../../../src/lib/types";

const frequency = frequencyJson as unknown as WordCategory;

function groupTotal(group: WordCategory["groups"][number]): number {
  return group.items.reduce((sum, item) => {
    const match = /вхождений в корпусе:\s*([\d\u00a0\s]+)/.exec(item.note ?? "");
    const digits = (match?.[1] ?? "").replace(/[^\d]/g, "");
    return sum + Number(digits || 0);
  }, 0);
}

describe("frequency category data shape", () => {
  const entries = frequency.groups.flatMap((g) => g.items);

  it("has the expected metadata", () => {
    expect(frequency.id).toBe("frequency");
    expect(frequency.lang).toBe("es");
    expect(frequency.title.ru).toBe("Частотные слова из книг");
    expect(frequency.title.en).toBe("Frequent words from the books");
  });

  it("has 200 entries", () => {
    expect(entries).toHaveLength(200);
  });

  it("has at least 6 groups, each titled and non-empty", () => {
    expect(frequency.groups.length).toBeGreaterThanOrEqual(6);
    for (const group of frequency.groups) {
      expect(group.title.trim(), `group ${group.title}`).toBeTruthy();
      expect(group.items.length, `group ${group.title}`).toBeGreaterThan(0);
    }
  });

  it("orders groups by non-increasing corpus frequency", () => {
    const totals = frequency.groups.map(groupTotal);
    for (let i = 0; i < totals.length - 1; i++) {
      expect(
        totals[i],
        `group ${frequency.groups[i].title} vs ${frequency.groups[i + 1].title}`,
      ).toBeGreaterThanOrEqual(totals[i + 1]);
    }
  });

  it("every entry is well-formed and glossed from the corpus", () => {
    for (const entry of entries) {
      expect(entry.es, `entry ${entry.es}`).toBeTruthy();
      expect(entry.pos, `entry ${entry.es}`).toBeTruthy();
      expect(entry.ru, `entry ${entry.es}`).toBeTruthy();
      expect(entry.example, `entry ${entry.es}`).toBeNull();
      expect(entry.note, `entry ${entry.es}`).toMatch(
        /^вхождений в корпусе: \d[\d\u00a0\s]*$/,
      );
    }
  });

  it("es values are globally unique", () => {
    const keys = entries.map((entry) => entry.es);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("contains no noisy part-of-speech labels", () => {
    const noisy = ["имя", "прочее", "name", "other"];
    for (const entry of entries) {
      expect(noisy, `entry ${entry.es}`).not.toContain(entry.pos);
    }
  });
});
