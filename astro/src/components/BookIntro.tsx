import { useEffect, useState } from 'react'
import { getLang, onLangChange, strings, chapterCount, type Lang } from '../lib/i18n'
import type { BookMeta } from '../lib/types'

export default function BookIntro({ book }: { book: BookMeta }) {
  const [lang, setLangState] = useState<Lang>(getLang())

  useEffect(() => onLangChange(setLangState), [])

  return (
    <div>
      <h1 className="text-2xl font-bold">{book.title}</h1>
      <p className="text-stone-500">{book.author}</p>
      <p className="mt-2 text-stone-700">{strings[lang].description}</p>
      <p>{chapterCount(book.chapters.length, lang)}</p>
    </div>
  )
}
