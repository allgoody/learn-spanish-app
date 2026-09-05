import { describe, it, expect } from "vitest";
import {
  parseBatchResponse,
  mergeGlosses,
  pendingKeys,
} from "../scripts/lib/gloss-parse.mjs";

describe("gloss-parse", () => {
  it("parses a json-fenced array", () => {
    const content =
      '```json\n[{"word": "hablaba", "ru": "говорил", "lemma": "hablar"}]\n```';
    const out = parseBatchResponse(content, ["hablaba"]);
    expect(out).toEqual({
      hablaba: { word: "hablaba", ru: "говорил", lemma: "hablar" },
    });
  });

  it("drops items whose word is not in the batch", () => {
    const content =
      '[{"word": "hablaba", "ru": "x"}, {"word": "otra", "ru": "y"}]';
    const out = parseBatchResponse(content, ["hablaba"]);
    expect(Object.keys(out)).toEqual(["hablaba"]);
  });

  it("mergeGlosses adds new keys and overwrites existing ones", () => {
    const target = { a: { ru: "1" } };
    mergeGlosses(target, { a: { ru: "2" }, b: { ru: "3" } });
    expect(target).toEqual({ a: { ru: "2" }, b: { ru: "3" } });
  });

  it("pendingKeys skips already-glossed keys", () => {
    expect(pendingKeys(["a", "b", "c"], { a: {}, c: {} })).toEqual(["b"]);
  });
});
