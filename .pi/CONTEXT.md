# Context — learn-spanish-app

**Project:** Spanish learning web app (static, mobile-first)
**Rules:** See `.pi/project-rules-memory.md` for tech stack, architecture, and design constraints.

Last updated: 2026-02-14

## Current Task

Idea discussion phase — no code written yet. User wants an Astro + Tailwind + React app to learn Spanish by reading a Spanish book with hover/tap word glosses (Russian translation + word-form/grammar explanation).

## Completed This Session

- [x] Discussed architecture: build-time LLM glossing → `glosses.json` committed to repo; runtime popup is instant/offline, no backend
- [x] Researched book options + copyright status (see Key Decisions)
- [x] Found PD adapted Don Quijote: Oca y Merino 1916 "acomodado para las escuelas primarias" (Wikisource scan, needs OCR)

## In Progress

- [ ] Nothing — waiting on user decisions

## Blocked / Needs Decision

- [?] Which book(s) first? (Quiroga recommended, Blasco Ibáñez for modern feel, or user's own private book)
- [?] Gloss approach: one-time LLM pass (recommended, includes grammar) vs free dictionary (translations only)
- [?] Scope: reading + glosses only, or known-words tracking / TTS audio / SRS flashcards from the start

## Next Steps

1. User picks book + gloss approach + scope
2. Scaffold Astro + Tailwind + React project
3. Build gloss pipeline script (download → clean → tokenize → dedupe → LLM batch-gloss with context → glosses.json)
4. Build reader UI: word spans with data-word, one delegated handler, popup/bottom-sheet

## Key Decisions

- **Build-time annotation, not runtime dictionary** — LLM glosses every unique word form with context sentence; result committed as JSON. Instant hover, offline, zero per-visitor cost
- **Public domain books only** for public deploy; user's own modern book = private use only
- **Book #1 candidate: Horacio Quiroga, "Cuentos de la selva" (1918, PD)** — simple language, short chapters
- **"Modern-feeling" PD pick: Blasco Ibáñez** (died 1928, PD everywhere) — La barraca, Cañas y barro
- **Don Quijote**: original too archaic for learners; Oca y Merino 1916 adaptation is the legal route (OCR needed); alternative = glosses with modern equivalents ("trujiste → trajiste (moderno)")
- **Avoid**: Platero y yo (EU copyright until 2029), Lorca (litigious estate), pirate sites (Lectulandia etc.)

## File Map

- No files created yet — empty repo (only .git, .orca)

## Gotchas / Warnings

- Wikisource Oca y Merino Quijote is a 54 MB scanned PDF — needs OCR + cleanup before use
- UNAM CEPE graded readers (free PDFs, B1–B2) and CVC "Lecturas paso a paso" are free legal modern content, but not novels
- Modern adaptations (Trapiello 2004, Anaya/Edelsa graded readers, Navarro Durán) are all copyrighted
