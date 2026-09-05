# Spanish Learning App — Idea & Research Findings

> Static web app (Astro + Tailwind + React, mobile-first) to learn Spanish by reading a Spanish book with tap/hover word glosses: Russian translation + explanation of word forms (tense, gender, etc.).

---

## 1. Core Architecture Idea

**Key insight: do the translation/grammar work at build time, not at runtime.**

1. **Tokenize** the book → collect every unique word form (~3–5k for a typical book).
2. **Batch-gloss** with an LLM, giving each word its context sentence (resolves homonyms, e.g. *iba* = ir vs. *iba* as a noun). One-time cost — a few dollars, or free with a local model.
3. Result is committed to the repo as `glosses.json`:

```json
"hablaba": {
  "lemma": "hablar",
  "pos": "verb",
  "ru": "говорил / говорила",
  "grammar": "pretérito imperfecto, 1ª/3ª pers. sing.",
  "note": "описывает длительное/повторяющееся действие в прошлом"
}
```

1. The site renders each word as a `<span data-word="hablaba">`; **one delegated event handler** looks up the gloss and shows the popup.

**Why this beats a runtime dictionary:**

- A plain dictionary can't explain word forms ("hablaba" needs: *hablar, imperfecto, 1ª/3ª pers. sing.*)
- Instant hover, works offline, zero per-visitor cost, no backend, no API keys in the browser
- Tailored to the book: only words that actually appear, with in-context senses

**Pipeline:** download (Gutenberg) → clean → chapters → tokenize → dedupe → LLM gloss → `glosses.json` → Astro renders.

## 2. UX (mobile-first)

- **Mobile:** tap a word → bottom sheet with translation + grammar breakdown. Tap elsewhere to close.
- **Desktop:** hover → tooltip; click → pin.
- Words with glosses get a subtle dotted underline (discoverability).
- **Phase 2 (later):** tap-to-mark-known (localStorage), browser TTS audio (free built-in Spanish voices), SRS flashcards from known/unknown words.

## 3. The Book — Copyright Reality

A static site is public, so the book must be **public domain** (or the user's own book, private use only). Spanish has a rich PD library; Project Gutenberg has ~1000+ Spanish titles in clean text.

### Recommended PD books

| Book | Author | Why |
| --- | --- | --- |
| **Cuentos de la selva (1918)** | Horacio Quiroga (†1937) | **Top pick.** Jungle stories about animals. Simple vocabulary, short chapters (5–10 min reads), engaging. The classic "first real book" for learners |
| **La barraca (1898), Cañas y barro (1902)** | Vicente Blasco Ibáñez (†1928) | PD everywhere. Naturalistic novels, gripping plots — the closest thing to a modern page-turner that's legal |
| **San Manuel Bueno, mártir (1930)** | Unamuno (†1936) | Short novella, modern prose, philosophical |
| **Novelas ejemplares** | Cervantes (†1616) | Short stories with real plots (Rinconete y Cortadillo) — Cervantes without the Quijote slog |
| **Leyendas** | Bécquer (†1870) | Beautiful short stories, slightly archaic |
| **Doña Perfecta (1876)** | Galdós (†1920) | Realistic novel, very readable, longer |
| **Campos de Castilla (1912)** | Machado (†1939) | Poetry, if verse is wanted |

### ⚠️ Famous books to AVOID

- **Don Quijote / Lazarillo de Tormes** — archaic 16th-century Spanish, hard even for natives (see §5)
- **Platero y yo** (Jiménez, 1914) — PD in the US, but **EU copyright until 2029**
- **García Lorca** (†1936) — legally PD in the EU since 2007, but the estate is litigious → takedown risk on a public site
- **Pirate sites** (Lectulandia, ebooklibres, etc.) — not an option

## 4. "Anything Modern?" — The Three Legal Paths

Truly modern books (last ~50 years) are **all copyrighted**. But "modern" for a learner mostly means *contemporary language* — and Spanish from 1900–1930 is essentially today's language.

### Path 1 — 20th-century PD that reads modern

- **Blasco Ibáñez** (†1928) — best "modern-feeling" pick, PD everywhere
- **Pío Baroja** (†1956) — PD in the EU from **January 2027** (almost there)
- **Platero y yo** — PD in US, EU from 2029

### Path 2 — user's own modern book (private use)

Buy any modern novel; the pipeline doesn't care. The app works identically — just **no public deploy**. Run locally or on a private server. The law, not the tech, is the constraint.

### Path 3 — free modern content that's legal to republish

- **UNAM CEPE graded readers** — free official university series PDFs written for learners (*Planetas y humanos* B1.1, *Dejando huella* B2.1, …)
- **CVC Cervantes "Lecturas paso a paso"** — free short modern readings for learners
- **Vikidia** — children's encyclopedia in Spanish, free license, modern simple text
- **Wikipedia es** — CC BY-SA
- CC-licensed novels: essentially don't exist in Spanish (only niche academic presses, e.g. Ediciones Imago Mundi)

## 5. Don Quijote Deep Dive

**Copyright: 100% fine** — public domain since forever, clean text on Gutenberg. The problem is the **language**: 17th-century Spanish — different grammar (future subjunctive, archaic forms like *trujiste* for *trajiste*), half-page sentences, wordplay on chivalric romances nobody reads. Many native speakers never finish it. For a learner it's demoralizing.

### Adapted / modernized editions

| Edition | Status |
| --- | --- |
| **Oca y Merino 1916 — "acomodado para las escuelas primarias"** | ✅ **Public domain.** Simplified for primary schools, 266 pp. Scanned PDF on Wikisource (54 MB) — **needs OCR + cleanup** |
| Trapiello's modernized version (2004) | ❌ Copyrighted (author alive) |
| Graded readers (Anaya, Edelsa, Santillana) | ❌ Copyrighted |
| Navarro Durán children's versions | ❌ Copyrighted |

### The elegant third option

**The app itself is the adaptation.** Take the original PD text and let the gloss system modernize it: every archaic word gets a gloss with its modern equivalent — *"trujiste → trajiste (moderno)"*, *"vos → tú"*. Read the real Quijote with a built-in translator that explains *why* it's archaic. Better learning experience than a flat modernization, zero copyright issues.

**Verdict:** Quijote = book #3 or #4 at most, via the Oca y Merino adaptation or the gloss-as-adaptation approach.

## 6. Decisions (made)

1. **Book #1: Unamuno — *Andanzas y visiones españolas* (1922)** — Gutenberg ebook #78052, clean plain text available. ~40 short essays, each essay = a chapter. Culture + modern prose.
2. **Gloss model: deepseek-v4-flash** (via ollama proxy) — one-time batch pass over unique word forms, free, no setup.
3. **v1 scope: reading + glosses only** — chapters, tap/hover glosses with grammar + phonetics, per-page precompiled libraries. Known-words tracking, TTS audio, SRS = later phases.
4. **UI language: Russian + English toggle** — glosses stay in Russian.

## 7. Proposed Build Order

1. Scaffold Astro + Tailwind + React (mobile-first)
2. Gloss pipeline script (download → clean → tokenize → dedupe → LLM batch-gloss → glosses.json)
3. Reader UI: word spans + one delegated handler + popup/bottom-sheet
4. Book #2+ becomes a ~10-minute job (pipeline is reusable)

## 8. Routing research (2026-09-05) — decision in `idea/routing.md`

**Question:** optimal/usual routing for a learning app where content language is fixed
per item (Spanish book) and the learner's translation language varies.

**Findings:**

1. **UX research — mixing languages is the anti-pattern.** A UX StackExchange case
   (identical setup: interface language vs. mother language vs. learning language)
   concludes: showing multiple languages at once looks messy/unprofessional, adds
   cognitive load, and users expect the app to follow their chosen language fully.
   → Validates tying gloss language to the app setting. Our current app (EN UI +
   RU glosses) is exactly the "mixed" state the research warns about.

2. **Astro's built-in i18n routing does NOT fit this case.** It's designed for
   *parallel locale trees* (same pages in many languages: `/[locale]/` prefixes,
   `prefixDefaultLocale`, per-locale fallback). Our content is not parallel — a
   Spanish book has no French version. Astro docs explicitly support manual routing
   (`routing: "manual"`); plain file-based routing is the right call.

3. **Industry practice (Duolingo, Babbel, LingQ):** the learner's language is a
   *setting*, never a URL dimension; the content/course language is either encoded
   as a (source, target) pair in the URL (Duolingo: `/course/es/ru/...`) or a
   filter/category (LingQ). No major learning app puts the UI language in the URL.
   → Our model (flat URLs, content language as data, translation = setting) is the
   industry-standard shape.

4. **Google's multilingual guidance** (separate URLs per language, hreflang) applies
   to multilingual *content* sites — not to single-language content with a UI
   dictionary. The applicable part: declare content language via `lang` attribute
   and JSON-LD `inLanguage`.

5. **intl-t.dev principle:** "choose your URLs independently of where the locale
   comes from" — locale from localStorage + language-free URLs is a supported,
   documented pattern.

**Conclusion:** the flat model (routing.md §4) matches both UX research and industry
practice. Astro's i18n routing stays unused; content pages declare `lang` statically.
