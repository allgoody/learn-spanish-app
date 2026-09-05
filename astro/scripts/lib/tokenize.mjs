const WORD_CHAR = /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9]/
const WORD = /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9]+/

export function tokenize(text, phrases) {
  const sorted = [...phrases].sort((a, b) => b.length - a.length)
  const out = []
  let i = 0
  while (i < text.length) {
    let matched = false
    for (const phrase of sorted) {
      if (text.slice(i, i + phrase.length).toLowerCase() === phrase) {
        const before = i > 0 ? text[i - 1] : ''
        const after = i + phrase.length < text.length ? text[i + phrase.length] : ''
        if ((!before || !WORD_CHAR.test(before)) && (!after || !WORD_CHAR.test(after))) {
          out.push({ t: text.slice(i, i + phrase.length), w: phrase })
          i += phrase.length
          matched = true
          break
        }
      }
    }
    if (matched) continue
    const ch = text[i]
    if (WORD_CHAR.test(ch)) {
      const m = text.slice(i).match(WORD)
      const word = m[0]
      out.push({ t: word, w: /^\d+$/.test(word) ? null : word.toLowerCase() })
      i += word.length
    } else {
      out.push({ t: ch, w: null })
      i += 1
    }
  }
  return out
}
