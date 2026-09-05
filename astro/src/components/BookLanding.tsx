import { useEffect, useState } from "react";
import {
    getLang,
    onLangChange,
    strings,
    chapterCount,
    type Lang,
} from "../lib/i18n";
import type { BookMeta } from "../lib/types";

export default function BookLanding({ book }: { book: BookMeta }) {
    const [lang, setLangState] = useState<Lang>("ru");

    useEffect(() => {
        setLangState(getLang());
        return onLangChange(setLangState);
    }, []);

    const s = strings[lang];

    return (
        <div>
            <a href="/" className="text-sm text-muted hover:text-accent">
                {s.backToBooks}
            </a>
            <h1 className="text-2xl font-bold mt-2">{book.title}</h1>
            <p className="text-muted">{book.author}</p>
            <p className="mt-2 text-ink">{s.description}</p>
            <p>{chapterCount(book.chapters.length, lang)}</p>
            <ul className="mt-8">
                {book.chapters.map((c) => (
                    <li key={c.id}>
                        <a
                            href={`/books/${book.id}/${c.id}`}
                            className="block py-2 border-b border-line hover:text-accent"
                        >
                            {c.title}
                        </a>
                    </li>
                ))}
            </ul>
        </div>
    );
}
