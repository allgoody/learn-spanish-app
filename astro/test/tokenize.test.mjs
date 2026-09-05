import { describe, it, expect } from "vitest";
import { tokenize } from "../scripts/lib/tokenize.mjs";

describe("tokenize", () => {
  it("matches phrases with longest-match and word boundaries", () => {
    expect(
      tokenize("A pesar de todo, hablaba despacio.", ["a pesar de"]),
    ).toEqual([
      { t: "A pesar de", w: "a pesar de" },
      { t: " ", w: null },
      { t: "todo", w: "todo" },
      { t: ",", w: null },
      { t: " ", w: null },
      { t: "hablaba", w: "hablaba" },
      { t: " ", w: null },
      { t: "despacio", w: "despacio" },
      { t: ".", w: null },
    ]);
  });

  it("keeps accents in keys", () => {
    expect(tokenize("Habló.", [])).toEqual([
      { t: "Habló", w: "habló" },
      { t: ".", w: null },
    ]);
  });

  it("does not match phrases mid-word", () => {
    expect(tokenize("a pesares", ["a pesar de"])).toEqual([
      { t: "a", w: "a" },
      { t: " ", w: null },
      { t: "pesares", w: "pesares" },
    ]);
  });

  it("matches phrases case-insensitively", () => {
    expect(tokenize("A PESAR DE todo", ["a pesar de"])).toEqual([
      { t: "A PESAR DE", w: "a pesar de" },
      { t: " ", w: null },
      { t: "todo", w: "todo" },
    ]);
  });

  it('respects word boundaries ("del" blocks the phrase)', () => {
    expect(tokenize("a pesar del viento", ["a pesar de"])).toEqual([
      { t: "a", w: "a" },
      { t: " ", w: null },
      { t: "pesar", w: "pesar" },
      { t: " ", w: null },
      { t: "del", w: "del" },
      { t: " ", w: null },
      { t: "viento", w: "viento" },
    ]);
  });

  it("nulls numbers", () => {
    expect(tokenize("En 1911 fui.", [])).toEqual([
      { t: "En", w: "en" },
      { t: " ", w: null },
      { t: "1911", w: null },
      { t: " ", w: null },
      { t: "fui", w: "fui" },
      { t: ".", w: null },
    ]);
  });
});
