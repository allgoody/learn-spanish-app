export type Lang = "ru" | "en";

export const strings: Record<Lang, Record<string, string>> = {
  ru: {
    translation: "Перевод",
    grammar: "Грамматика",
    lemma: "Словарная форма",
    pos: "Часть речи",
    level: "Уровень",
    modern: "Современный эквивалент",
    falseFriend: "Ложный друг",
    note: "Примечание",
    close: "Закрыть",
    menu: "Меню",
    appLanguage: "Язык приложения",
    booksSection: "Книги",
    wordsSection: "Категории слов",
    backToBooks: "← Все книги",
    backHome: "← На главную",
    colorTheme: "Цветовая тема",
    light: "Светлая",
    dark: "Тёмная",
    system: "Системная",
    description:
      "«Странствия и видения Испании» — сборник очерков Мигеля де Унамуно о путешествиях по Испании.",
    about: "О проекте",
    privacy: "Конфиденциальность",
    footerNav: "Навигация в подвале",
    cookieText:
      "Мы используем cookie и Google Analytics, чтобы понимать, как используется сайт.",
    cookieAccept: "Принять",
    cookieDecline: "Отклонить",
  },
  en: {
    translation: "Translation",
    grammar: "Grammar",
    lemma: "Dictionary form",
    pos: "Part of speech",
    level: "Level",
    modern: "Modern equivalent",
    falseFriend: "False friend",
    note: "Note",
    close: "Close",
    menu: "Menu",
    appLanguage: "App language",
    booksSection: "Books",
    wordsSection: "Word categories",
    backToBooks: "← All books",
    backHome: "← Home",
    colorTheme: "Color theme",
    light: "Light",
    dark: "Dark",
    system: "System",
    description:
      "Andanzas y visiones españolas — Miguel de Unamuno's essay collection on travels through Spain.",
    about: "About",
    privacy: "Privacy",
    footerNav: "Footer navigation",
    cookieText:
      "We use cookies and Google Analytics to understand how the site is used.",
    cookieAccept: "Accept",
    cookieDecline: "Decline",
  },
};

function pluralRu(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

export function chapterCount(n: number, lang: Lang): string {
  if (lang === "ru") return `${n} ${pluralRu(n, "глава", "главы", "глав")}`;
  return `${n} ${n === 1 ? "chapter" : "chapters"}`;
}

export function getLang(): Lang {
  // ponytail: English removed from the app (2026-09-05) — stale localStorage
  // "en" prefs are ignored until URL-based i18n lands (see .pi/CONTEXT.md).
  return "ru";
}

const listeners = new Set<(l: Lang) => void>();

export function setLang(l: Lang): void {
  localStorage.setItem("lang", l);
  if (!document.documentElement.hasAttribute("data-content-lang")) {
    document.documentElement.lang = l;
  }
  listeners.forEach((cb) => cb(l));
}

export function onLangChange(cb: (l: Lang) => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
