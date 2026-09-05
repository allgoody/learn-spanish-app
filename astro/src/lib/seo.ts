import type { BookMeta, ChapterMeta, WordCategory } from "./types";
import type { Lang } from "./i18n";

// ponytail: single-language until URL-based i18n lands (see .pi/CONTEXT.md
// "Multi-language"). When /en/ routes exist, seoLang becomes a function of the
// URL prefix and every page keeps working unchanged.
export const seoLang: Lang = "ru";

interface SeoStrings {
  homeTitle: string;
  homeDescription: string;
  bookTitle: (b: BookMeta) => string;
  bookDescription: (b: BookMeta) => string;
  chapterTitle: (b: BookMeta, c: ChapterMeta) => string;
  chapterDescription: (b: BookMeta, c: ChapterMeta) => string;
  categoryTitle: (c: WordCategory) => string;
  categoryDescription: (c: WordCategory) => string;
}

export const seo: Record<Lang, SeoStrings> = {
  ru: {
    homeTitle:
      "Учить испанский язык — книги с переводом и словарём | Aprende español",
    homeDescription:
      "Учите испанский язык: читайте книги с интегрированным словарём и изучайте слова по темам. Бесплатно, онлайн.",
    bookTitle: (b) => `${b.title} — читать на испанском с переводом`,
    bookDescription: (b) =>
      `Читайте «${b.title}» ${b.author} на испанском языке с переводом слов и пояснениями.`,
    chapterTitle: (b, c) => `${c.title} — ${b.title} с переводом`,
    chapterDescription: (b, c) =>
      `Глава «${c.title}» из «${b.title}» — читайте на испанском с переводом слов.`,
    categoryTitle: (c) => c.title.ru,
    categoryDescription: (c) =>
      `Испанские слова по теме «${c.title.ru}» с переводом и пояснениями.`,
  },
  en: {
    homeTitle:
      "Learn Spanish — read books with translation and glossary | Aprende español",
    homeDescription:
      "Learn Spanish: read books with an integrated glossary and study words by topic. Free, online.",
    bookTitle: (b) => `${b.title} — read in Spanish with translation`,
    bookDescription: (b) =>
      `Read «${b.title}» by ${b.author} in Spanish with word translations and notes.`,
    chapterTitle: (b, c) => `${c.title} — ${b.title} with translation`,
    chapterDescription: (b, c) =>
      `Chapter «${c.title}» from «${b.title}» — read in Spanish with word translations.`,
    categoryTitle: (c) => c.title.en,
    categoryDescription: (c) =>
      `Spanish words on the topic «${c.title.en}» with translations and notes.`,
  },
};
