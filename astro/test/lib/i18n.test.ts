import { describe, it, expect, beforeEach } from "vitest";
import {
  chapterCount,
  getLang,
  setLang,
  onLangChange,
} from "../../src/lib/i18n";

describe("chapterCount (ru plural rule)", () => {
  it("1 → глава", () => {
    expect(chapterCount(1, "ru")).toBe("1 глава");
  });

  it("2 → главы", () => {
    expect(chapterCount(2, "ru")).toBe("2 главы");
  });

  it("5 → глав", () => {
    expect(chapterCount(5, "ru")).toBe("5 глав");
  });

  it("11 → глав (teens exception)", () => {
    expect(chapterCount(11, "ru")).toBe("11 глав");
  });

  it("12 → глав (teens exception)", () => {
    expect(chapterCount(12, "ru")).toBe("12 глав");
  });

  it("14 → глав (teens exception)", () => {
    expect(chapterCount(14, "ru")).toBe("14 глав");
  });

  it("21 → глава (ends in 1, not a teen)", () => {
    expect(chapterCount(21, "ru")).toBe("21 глава");
  });

  it("22 → главы (ends in 2, not a teen)", () => {
    expect(chapterCount(22, "ru")).toBe("22 главы");
  });

  it("41 → глава (the book's 41 essays)", () => {
    expect(chapterCount(41, "ru")).toBe("41 глава");
  });

  it("101 → глава", () => {
    expect(chapterCount(101, "ru")).toBe("101 глава");
  });
});

describe("chapterCount (en)", () => {
  it("1 → chapter", () => {
    expect(chapterCount(1, "en")).toBe("1 chapter");
  });

  it("2 → chapters", () => {
    expect(chapterCount(2, "en")).toBe("2 chapters");
  });
});

describe("lang", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.lang = "";
  });

  it("defaults to ru", () => {
    expect(getLang()).toBe("ru");
  });

  it("ignores stale en from storage (English removed 2026-09-05)", () => {
    localStorage.setItem("lang", "en");
    expect(getLang()).toBe("ru");
  });

  it("setLang persists, sets html lang, and notifies listeners", () => {
    const seen: string[] = [];
    const off = onLangChange((l) => seen.push(l));
    setLang("ru");
    expect(localStorage.getItem("lang")).toBe("ru");
    expect(document.documentElement.lang).toBe("ru");
    expect(seen).toEqual(["ru"]);
    off();
  });
});
