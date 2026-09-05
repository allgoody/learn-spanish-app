import { useEffect, useState } from "react";
import {
  getLang,
  onLangChange,
  strings,
  chapterCount,
  type Lang,
} from "../lib/i18n";
import { languages } from "../lib/words";
import type { BookMeta, WordCategory } from "../lib/types";

export default function Chooser({
  books,
  categories,
}: {
  books: BookMeta[];
  categories: WordCategory[];
}) {
  const [lang, setLangState] = useState<Lang>("ru");

  useEffect(() => {
    setLangState(getLang());
    return onLangChange(setLangState);
  }, []);

  const s = strings[lang];

  return (
    <div>
      {languages.map((l) => {
        const langBooks = books.filter((b) => b.lang === l.id);
        const langCats = categories.filter((c) => c.lang === l.id);
        if (!langBooks.length && !langCats.length) return null;
        return (
          <section key={l.id} className="mb-10">
            <h2 className="text-2xl font-bold mb-4">{l.name}</h2>
            {langBooks.length > 0 && (
              <>
                <h3 className="text-lg font-semibold mb-2">{s.booksSection}</h3>
                <ul className="space-y-3 mb-6">
                  {langBooks.map((b) => (
                    <li key={b.id}>
                      <a
                        href={`/books/${b.id}/`}
                        className="block p-4 border border-line rounded hover:border-accent hover:bg-surface-hover"
                      >
                        <div className="font-semibold">{b.title}</div>
                        <div className="text-sm text-muted">
                          {b.author} · {chapterCount(b.chapters.length, lang)}
                        </div>
                      </a>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {langCats.length > 0 && (
              <>
                <h3 className="text-lg font-semibold mb-2">{s.wordsSection}</h3>
                <ul className="space-y-3">
                  {langCats.map((c) => (
                    <li key={c.id}>
                      <a
                        href={`/words/${c.id}/`}
                        className="block p-4 border border-line rounded hover:border-accent hover:bg-surface-hover"
                      >
                        <div className="font-semibold">{c.title[lang]}</div>
                      </a>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        );
      })}
    </div>
  );
}
