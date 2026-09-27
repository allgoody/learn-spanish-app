import { describe, it, expect } from "vitest";
import {
  mergeGlossaries,
  countLemmaFrequency,
  buildFrequencyCategory,
} from "../scripts/lib/frequency.mjs";

describe("mergeGlossaries", () => {
  it("votes with non-noisy candidates only (el: art beats noisy other)", () => {
    const merged = mergeGlossaries([
      { el: { lemma: "el", pos: "art", ru: "арт" } },
      { el: { lemma: "el", pos: "other", ru: null } },
      { el: { lemma: "el", pos: "other", ru: null } },
    ]);
    expect(merged.get("el").pos).toBe("art");
  });

  it("majority across books fixes single-book mislabels (para: prep)", () => {
    const merged = mergeGlossaries([
      { para: { lemma: "parar", pos: "verb", ru: "ост." } },
      { para: { lemma: "para", pos: "prep", ru: "для" } },
      { para: { lemma: "para", pos: "prep", ru: "для" } },
      { para: { lemma: "para", pos: "prep", ru: "для" } },
    ]);
    expect(merged.get("para").pos).toBe("prep");
    expect(merged.get("para").lemma).toBe("para");
  });
});

describe("countLemmaFrequency", () => {
  const books = [
    {
      id: "A",
      tokens: ["el", "el", "la", "de", "es"],
      glosses: {
        el: { lemma: "el", pos: "art", ru: "арт" },
        la: { lemma: "el", pos: "art", ru: "арт" },
        de: { lemma: "de", pos: "prep", ru: "из" },
        es: { lemma: "ser", pos: "verb", ru: "есть" },
      },
    },
    {
      id: "B",
      tokens: [
        { t: "el", w: "el" },
        { t: "la", w: "la" },
        { t: "los", w: "los" },
        { t: "las", w: "las" },
        { t: "de", w: "de" },
        { t: "de", w: "de" },
      ],
      glosses: {
        el: { lemma: "el", pos: "other", ru: null },
        la: { lemma: "el", pos: "other", ru: null },
        los: { lemma: "el", pos: "other", ru: null },
        las: { lemma: "el", pos: "other", ru: null },
        de: { lemma: "de", pos: "prep", ru: "из" },
      },
    },
  ];

  it("normalises string and { t, w } tokens and merges lemmas", () => {
    const freq = countLemmaFrequency(books);
    expect(freq.get("el").count).toBe(7);
    expect(freq.get("de").count).toBe(3);
    expect(freq.get("ser").count).toBe(1);
  });

  it("chooses art for el (noisy other is never a vote)", () => {
    const freq = countLemmaFrequency(books);
    expect(freq.get("el").pos).toBe("art");
  });
});

describe("buildFrequencyCategory", () => {
  it("ranks, groups and labels with Russian POS names", () => {
    const freq = countLemmaFrequency([
      {
        id: "A",
        tokens: ["el", "el", "la", "de", "es"],
        glosses: {
          el: { lemma: "el", pos: "art", ru: "арт" },
          la: { lemma: "el", pos: "art", ru: "арт" },
          de: { lemma: "de", pos: "prep", ru: "из" },
          es: { lemma: "ser", pos: "verb", ru: "есть" },
        },
      },
      {
        id: "B",
        tokens: [
          { t: "el", w: "el" },
          { t: "la", w: "la" },
          { t: "los", w: "los" },
          { t: "las", w: "las" },
          { t: "de", w: "de" },
          { t: "de", w: "de" },
        ],
        glosses: {
          el: { lemma: "el", pos: "other", ru: null },
          la: { lemma: "el", pos: "other", ru: null },
          los: { lemma: "el", pos: "other", ru: null },
          las: { lemma: "el", pos: "other", ru: null },
          de: { lemma: "de", pos: "prep", ru: "из" },
        },
      },
    ]);
    const cat = buildFrequencyCategory(freq, { limit: 2 });
    expect(cat.id).toBe("frequency");
    expect(cat.groups.flatMap((g) => g.items)).toHaveLength(2);
    expect(cat.groups.map((g) => g.title)).toEqual(["артикль", "предлог"]);
    expect(cat.groups[0].items.map((i) => i.es)).toEqual(["el"]);
    expect(cat.groups[1].items.map((i) => i.es)).toEqual(["de"]);
    expect(cat.groups[0].items[0].pos).toBe("артикль");
    expect(cat.groups[0].items[0].note).toMatch(/вхождений в корпусе: \d/);
  });

  it("drops lemmas whose only candidate POS is noisy", () => {
    const freq = new Map([
      [
        "fulano",
        { lemma: "fulano", count: 5, pos: "other", ref: { ru: null, ipa: null } },
      ],
      [
        "gente",
        {
          lemma: "gente",
          count: 4,
          pos: "noun",
          ref: { ru: "люди", ipa: "/ˈxente/", grammar: null },
        },
      ],
    ]);
    const cat = buildFrequencyCategory(freq);
    const items = cat.groups.flatMap((g) => g.items);
    expect(items.map((i) => i.es)).toEqual(["gente"]);
  });
});
