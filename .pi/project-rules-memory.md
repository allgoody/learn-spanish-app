# Project Rules: learn-spanish-app

## Tech Stack

- Astro (static) + Tailwind CSS + React (islands), mobile-first
- No backend, no runtime API keys

## Architecture

- **Build-time gloss pipeline**: script downloads book → cleans → tokenizes → dedupes word forms → LLM batch-glosses with context sentences → commits `glosses.json` (word → {lemma, pos, ru, grammar, note})
- **Reader UI**: every word rendered as a span with `data-word`; ONE delegated event handler; popup on hover (desktop) / bottom-sheet on tap (mobile)
- Books as structured chapters (markdown/JSON) in content collections

## Design System

- Footer must include subtle 'Made by CTDev' credit linking to <https://ctdev.dev/> (target=_blank, rel=noopener noreferrer, ~0.65rem, muted, ~0.6 opacity, underline on hover)

## Active Constraints

- **Copyright**: public domain books ONLY in the public app. User's own modern book = private use only (no public deploy)
- Temp/working files MUST be created in `.tmp/` under the repo root, never in system `/tmp/` or outside the workspace. `.tmp/` should be in `.gitignore`. Clean up with `rm -rf .tmp/` after use.
- Never deploy unless the user explicitly asks in the current request

## Lessons

- Don Quijote original (1605) is archaic 17th-century Spanish — hard even for natives; not a learner's first book
- Platero y yo (Jiménez, 1914): PD in US, but EU copyright until 2029 — avoid for public sites
- Lorca: legally PD (died 1936) but estate is litigious — takedown risk
- Modern Quijote adaptations (Trapiello 2004, Anaya/Edelsa, Navarro Durán) are all copyrighted
- PD adapted Quijote exists: Oca y Merino 1916 "acomodado para las escuelas primarias" — Wikisource scan, needs OCR
- Free legal modern content: UNAM CEPE graded readers (B1–B2 PDFs), CVC "Lecturas paso a paso", Vikidia (children's encyclopedia, free license)
- Blasco Ibáñez (died 1928) = PD + modern-feeling prose; Pío Baroja PD in EU from Jan 2027

## Dependencies

- None installed yet — project not scaffolded
