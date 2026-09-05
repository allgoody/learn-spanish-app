# Routing & Language Model — Decision Record

> Decided 2026-09-05 (discussion with user). Supersedes the earlier plan idea of a
> source-language URL prefix (`/es/books/...`). This file is the source of truth for
> URL structure and language handling.

---

## 1. The three language dimensions — only one is routing

| Dimension | Example | Where it lives |
|---|---|---|
| **Content language** | the book is in *Spanish*; the lesson is *Spanish pronouns* | **Data** (`lang` field on book/category) — NOT the URL |
| **UI language** | buttons/headers in RU or EN | localStorage (`lang` key, `data-lang` on `<html>`) |
| **Translation (gloss) language** | translations *of* words — RU today, EN later | **Tied to the app setting** (same setting as UI language) |

**Decision: content language is fixed per item and lives in data, not routes.**
A learning app is the opposite of a multilingual content site: Unamuno is Spanish
for every user; what varies per user is the *translation* language. So the URL
never encodes content language.

## 2. Translation language = the app setting

- The hamburger "App language" toggle (RU/EN) drives **both** UI strings and glosses.
- Side effect: fixes the current wart where EN UI users still get Russian glosses.
- Gloss data model (future): `glosses.json` schema `ru: "..."` → per-language map
  `{ ru: "...", en: "..." }`. Pipeline re-runs with a bilingual prompt (11.7k word
  forms × 2 languages — incremental, user-driven, NOT part of the routing work).
- Reader fallback rule: gloss missing the requested language → fall back to `ru`,
  then lemma only.
- If a user ever needs gloss language ≠ UI language, split the setting then (YAGNI now).

## 3. Word lessons are language-specific content

"Pronouns" in Spanish ≠ "pronouns" in French — different words, different lesson.
Books are safe flat (ids are unique), but category ids must be **per-language slugs**:

- `/words/pronouns/` — Spanish lesson (own data file, `lang: "es"`)
- `/words/pronoms/` — French lesson later (own id, `lang: "fr"`)

No prefix, no collision, deep links stay stable. The chooser shows them as separate
cards ("Pronouns — Español", "Pronoms — Français"). Language is a badge + `lang`
attribute on the page.

## 4. Final URL tree

```
/                          chooser — sections per source language (books + word categories)
/books/andanzas/           book landing (meta.lang = "es")
/books/andanzas/{slug}    chapter reader — URLs unchanged, zero redirects
/words/pronouns/           Spanish lesson (own id, lang = "es")
/words/pronoms/            French lesson later (own id)
```

- Chapter URLs (`/books/andanzas/{slug}`) are already live on Cloudflare Pages and
  **never move** — no `_redirects` file needed.
- Source language is **not** a persistent setting — just chooser sections grouped by
  `lang`. A filter setting would be state that does nothing the sections don't do.

## 5. Data model consequences

- `BookMeta` gains `lang: "es"` (chooser sections, `<html lang>`, JSON-LD `inLanguage`).
- `WordCategory` gains `lang`.
- `<html lang>` on content pages reflects the **content** language (a11y/SEO);
  UI strings stay RU/EN via the setting. (Current no-FOUC script sets `lang` from the
  UI setting — needs a per-page static override on content pages.)

## 6. Rejected alternative: source-language URL prefix

`/es/books/...`, `/es/words/...` — right shape for multilingual content sites
(same content in many languages), wrong for a learning app (content language fixed,
learner's language varies). Cost analysis at decision time: prefix-now ≈ trivial cost
either way; flat-now + migrate-later ≈ same plus churning every link built in between.
Rejected because the flat model matches the domain, not because of cost alone.

## 7. Open items

- [ ] Glosses per-language map + bilingual pipeline re-run (user-driven, later)
- [x] `<html lang>` static override on content pages (done 2026-09-05, plan restructure-routing)
- [x] ~~UI language in URL? No.~~ **SUPERSEDED 2026-09-05 — see §8.** The old "localStorage is fine for an app" reasoning predated SEO as a goal; localStorage is invisible to crawlers, so a 2nd UI language requires per-language URLs

## 8. Future: UI language in the URL (locked 2026-09-05)

> Decision record for when a 2nd UI language (English) is re-enabled. The app is
> Russian-only today (`LANGS = ["ru"]` in HeaderMenu; `en` strings kept in
> `lib/i18n.ts` + `lib/seo.ts` as future data). Full trace: `.pi/CONTEXT.md`
> "Multi-language (locked decisions)".

- **Model: subdirectory per language + hreflang** — `/` = Russian (default, keep as-is), `/en/` = English, future `/de/` etc. NOT query params (Google indexes one version only), NOT subdomains (splits domain authority), NOT JS-only swapping (invisible to crawlers).
- **hreflang**: `<link rel="alternate" hreflang="ru|en|x-default">` generated in Layout from the current URL by swapping the prefix. Blesses near-duplicate chapter pages (Spanish text shared, chrome/glossary differ).
- **Per-language vs shared**: UI strings + gloss translations + SEO titles/descriptions (`lib/seo.ts` map) + `lang` attr + JSON-LD `inLanguage` + `og:locale` are per-language; Spanish book text + chapter structure are shared. Chapter pages keep `lang="es"` even in the English version.
- **Implementation sketch**: move pages under `src/pages/[lang]/...` (Astro `i18n` config, `defaultLocale: 'ru'`), drive the header toggle by URL instead of localStorage, `seoLang` becomes a function of the URL prefix — page templates keep working unchanged.
- **Also needed then**: `sitemap.xml` with hreflang annotations (`@astrojs/sitemap` supports i18n) + `robots.txt` — neither exists yet.
- **Gloss language follows UI language** (§2) — per-language gloss map `{ru, en}` is a separate data task (§7).
