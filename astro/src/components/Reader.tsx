import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { GlossLibrary } from '../lib/types'
import { getLang, onLangChange, strings, type Lang } from '../lib/i18n'

interface Props {
  glosses: GlossLibrary
}

interface OpenState {
  key: string
  el: HTMLElement
}

export default function Reader({ glosses }: Props) {
  const [open, setOpen] = useState<OpenState | null>(null)
  const [lang, setLangState] = useState<Lang>(() => getLang())
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)
  const popupRef = useRef<HTMLDivElement>(null)
  const isHoverRef = useRef(false)
  const pinnedRef = useRef(false)
  const openRef = useRef<OpenState | null>(null)
  openRef.current = open

  useEffect(() => {
    isHoverRef.current = window.matchMedia('(hover: hover)').matches
    return onLangChange(setLangState)
  }, [])

  const insidePopup = (target: EventTarget | null) =>
    popupRef.current?.contains(target as Node) ?? false

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement).closest('[data-word]') as HTMLElement | null
      if (el) {
        const key = el.getAttribute('data-word')!
        setOpen((cur) =>
          cur && cur.key === key && cur.el === el && pinnedRef.current ? null : { key, el },
        )
        pinnedRef.current = true
        return
      }
      if (!insidePopup(e.target)) {
        pinnedRef.current = false
        setOpen(null)
      }
    }
    const onMouseOver = (e: MouseEvent) => {
      if (!isHoverRef.current) return
      const el = (e.target as HTMLElement).closest('[data-word]') as HTMLElement | null
      if (el) {
        pinnedRef.current = false
        setOpen({ key: el.getAttribute('data-word')!, el })
        return
      }
      if (!insidePopup(e.target) && !pinnedRef.current) setOpen(null)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        pinnedRef.current = false
        setOpen(null)
        return
      }
      if (e.key === 'Enter' || e.key === ' ') {
        const el = (e.target as HTMLElement).closest('[data-word]') as HTMLElement | null
        if (el) {
          e.preventDefault()
          setOpen({ key: el.getAttribute('data-word')!, el })
        }
      }
    }
    const onScroll = (e: Event) => {
      if (!openRef.current) return
      if (!insidePopup(e.target)) {
        pinnedRef.current = false
        setOpen(null)
      }
    }
    document.addEventListener('click', onDocClick)
    document.addEventListener('mouseover', onMouseOver)
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('scroll', onScroll, true)
    return () => {
      document.removeEventListener('click', onDocClick)
      document.removeEventListener('mouseover', onMouseOver)
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('scroll', onScroll, true)
    }
  }, [])

  useLayoutEffect(() => {
    if (!open || !isHoverRef.current) return
    const popup = popupRef.current
    if (!popup) return
    const rect = open.el.getBoundingClientRect()
    const h = popup.offsetHeight
    const left = Math.min(Math.max(rect.left + rect.width / 2 - 160, 8), window.innerWidth - 328)
    let top = rect.top - 12
    if (top - h < 8) top = h + 8
    setPos({ left, top })
  }, [open])

  if (!open) return null

  const gloss = glosses[open.key]
  const word = open.el.textContent ?? open.key
  const s = strings[lang]
  const row = (label: string, value: ReactNode) =>
    value == null ? null : (
      <div key={label}>
        <div className="text-xs text-stone-500">{label}</div>
        <div>{value}</div>
      </div>
    )

  const content = gloss ? (
    <>
      {gloss.ipa && <div className="font-mono text-xs opacity-80">{gloss.ipa}</div>}
      <div className="text-lg font-medium">{gloss.ru}</div>
      {row(s.grammar, gloss.grammar)}
      {(gloss.lemma || gloss.pos) &&
        row(s.lemma, [gloss.lemma, gloss.pos].filter(Boolean).join(' · '))}
      {row(
        s.level,
        gloss.cefr && (
          <span className="inline-block rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800">
            {gloss.cefr}
          </span>
        ),
      )}
      {row(s.modern, gloss.modern)}
      {gloss.false_friend && (
        <div className="rounded bg-amber-100/80 p-2 text-amber-800">
          <div className="text-xs font-semibold">{s.falseFriend}</div>
          <div>{gloss.false_friend}</div>
        </div>
      )}
      {row(s.note, gloss.note)}
    </>
  ) : (
    <div>—</div>
  )

  if (isHoverRef.current) {
    return (
      <div
        ref={popupRef}
        role="dialog"
        aria-label={open.key}
        className="fixed z-50 w-80 max-w-[calc(100vw-16px)] rounded-lg bg-stone-900 p-3 text-sm text-stone-50 shadow-lg transition-opacity"
        style={{ left: pos?.left, top: pos?.top, transform: 'translateY(-100%)' }}
      >
        <div className="mb-2 font-semibold">{word}</div>
        {content}
      </div>
    )
  }

  return (
    <div
      ref={popupRef}
      role="dialog"
      aria-label={open.key}
      className="fixed inset-x-0 bottom-0 z-50 max-h-[60vh] overflow-y-auto rounded-t-2xl border-t bg-white p-4 shadow-xl"
    >
      <button
        type="button"
        onClick={() => setOpen(null)}
        className="absolute right-3 top-3 text-sm text-stone-500 hover:text-stone-800"
      >
        {s.close}
      </button>
      <div className="mb-2 font-semibold">{word}</div>
      {content}
    </div>
  )
}
