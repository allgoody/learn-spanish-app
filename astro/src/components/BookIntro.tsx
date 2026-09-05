import { useEffect, useState } from "react";
import {
  getLang,
  onLangChange,
  strings,
  chapterCount,
  type Lang,
} from "../lib/i18n";
import type { BookMeta } from "../lib/types";

export default function BookIntro({ book }: { book: BookMeta }) {
  const [lang, setLangState] = useState<Lang>("ru");

  useEffect(() => {
    setLangState(getLang());
    return onLangChange(setLangState);
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold">{book.title}</h1>
      <p className="text-muted">{book.author}</p>
      <p className="mt-2 text-ink">{strings[lang].description}</p>
      <p>{chapterCount(book.chapters.length, lang)}</p>
    </div>
  );
}
