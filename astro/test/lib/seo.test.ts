import { describe, it, expect } from "vitest";
import { seo, seoLang } from "../../src/lib/seo";
import type { BookMeta, ChapterMeta, WordCategory } from "../../src/lib/types";

const book: BookMeta = {
  id: "andanzas",
  lang: "es",
  title: "Andanzas y visiones españolas",
  author: "Miguel de Unamuno",
  source: "gutenberg",
  chapters: [{ id: "prologo", title: "PRÓLOGO" }],
};

const chapter: ChapterMeta = { id: "prologo", title: "PRÓLOGO" };

const category: WordCategory = {
  id: "pronouns",
  lang: "es",
  title: { ru: "Местоимения", en: "Pronouns" },
  groups: [],
};

const SEO_KEYS = [
  "homeTitle",
  "homeDescription",
  "bookTitle",
  "bookDescription",
  "chapterTitle",
  "chapterDescription",
  "categoryTitle",
  "categoryDescription",
] as const;

describe("seo map", () => {
  it("seoLang is ru (single-language app until URL-based i18n)", () => {
    expect(seoLang).toBe("ru");
  });

  it("has both ru and en entries (en kept as future data)", () => {
    expect(Object.keys(seo).sort()).toEqual(["en", "ru"]);
  });

  it("every language entry exposes all 8 SEO slots (2 strings, 6 functions)", () => {
    for (const lang of ["ru", "en"] as const) {
      for (const key of SEO_KEYS) {
        const expected =
          key === "homeTitle" || key === "homeDescription"
            ? "string"
            : "function";
        expect(typeof seo[lang][key], `${lang}.${key}`).toBe(expected);
      }
    }
  });

  it("ru home title and description are non-empty", () => {
    expect(seo.ru.homeTitle.length).toBeGreaterThan(0);
    expect(seo.ru.homeDescription.length).toBeGreaterThan(0);
  });

  it("ru book title/description embed the book title and author", () => {
    expect(seo.ru.bookTitle(book)).toContain(book.title);
    expect(seo.ru.bookDescription(book)).toContain(book.title);
    expect(seo.ru.bookDescription(book)).toContain(book.author);
  });

  it("ru chapter title/description embed chapter and book titles", () => {
    expect(seo.ru.chapterTitle(book, chapter)).toContain(chapter.title);
    expect(seo.ru.chapterTitle(book, chapter)).toContain(book.title);
    expect(seo.ru.chapterDescription(book, chapter)).toContain(chapter.title);
    expect(seo.ru.chapterDescription(book, chapter)).toContain(book.title);
  });

  it("ru category title/description use the Russian category title", () => {
    expect(seo.ru.categoryTitle(category)).toBe(category.title.ru);
    expect(seo.ru.categoryDescription(category)).toContain(category.title.ru);
  });

  it("en entries are distinct future data, not ru copies", () => {
    expect(seo.en.homeTitle).not.toBe(seo.ru.homeTitle);
    expect(seo.en.categoryTitle(category)).toBe(category.title.en);
    expect(seo.en.bookTitle(book)).toContain(book.title);
  });
});
