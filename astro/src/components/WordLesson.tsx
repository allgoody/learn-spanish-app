import { useEffect, useState } from "react";
import { getLang, onLangChange, strings, type Lang } from "../lib/i18n";
import type { WordCategory } from "../lib/types";

export default function WordLesson({ category }: { category: WordCategory }) {
  const [lang, setLangState] = useState<Lang>("ru");

  useEffect(() => {
    setLangState(getLang());
    return onLangChange(setLangState);
  }, []);

  const s = strings[lang];

  return (
    <div>
      <a href="/" className="text-sm text-muted hover:text-accent">
        {s.backHome}
      </a>
      <h1 className="text-2xl font-bold mt-2 mb-6">{category.title[lang]}</h1>
      {category.groups.map((g) => (
        <section key={g.title} className="mb-8">
          <h2 className="text-lg font-semibold mb-2">{g.title}</h2>
          {g.note && <p className="text-sm text-muted mb-2">{g.note}</p>}
          <ul>
            {g.items.map((it) => (
              <li key={it.es} className="py-2 border-b border-line">
                <div className="flex items-baseline gap-2">
                  <span className="font-semibold">{it.es}</span>
                  {it.ipa && (
                    <span className="font-mono text-xs text-muted">
                      {it.ipa}
                    </span>
                  )}
                  <span className="text-xs text-muted">{it.pos}</span>
                </div>
                <div className="text-ink">{it.ru}</div>
                {it.example && (
                  <div className="text-sm text-muted">
                    <span className="italic">{it.example.es}</span>{" "}
                    <span>— {it.example.ru}</span>
                  </div>
                )}
                {it.grammar && (
                  <div className="text-sm text-muted">{it.grammar}</div>
                )}
                {it.note && <div className="text-sm text-muted">{it.note}</div>}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
