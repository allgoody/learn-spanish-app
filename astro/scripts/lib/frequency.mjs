// Corpus-frequency helper: merge per-book glossaries, count lemmas across all
// tokens, and build the `frequency` WordCategory. Pure logic — no filesystem,
// no network. CLI wrapper: scripts/build-frequency-words.mjs.

export const POS_RU = {
  verb: "глагол",
  noun: "сущ.",
  adj: "прил.",
  adv: "нареч.",
  pron: "мест.",
  prep: "предлог",
  conj: "союз",
  num: "числ.",
  interj: "межд.",
  art: "артикль",
};

export const DEFAULT_EXCLUDE_POS = ["name", "other"];

export function isNoisy(entry) {
  return !entry || !entry.ru || DEFAULT_EXCLUDE_POS.includes(entry.pos);
}

/**
 * Step 1: merge per-book glossaries into one `form -> entry` map.
 * A candidate votes on its (lemma, pos) pair only when it is not noisy; if a
 * form has no non-noisy candidate, its noisy candidates are used instead.
 */
export function mergeGlossaries(glossaries) {
  const forms = new Set();
  for (const g of glossaries) for (const f of Object.keys(g)) forms.add(f);

  const merged = new Map();
  for (const form of forms) {
    const candidates = [];
    glossaries.forEach((g, bookIndex) => {
      const entry = g[form];
      if (entry) candidates.push({ form, entry, bookIndex });
    });
    if (candidates.length === 0) continue;

    const nonNoisy = candidates.filter((c) => !isNoisy(c.entry));
    const pool = nonNoisy.length > 0 ? nonNoisy : candidates;

    const byPair = new Map();
    for (const c of pool) {
      const key = `${c.entry.lemma}\u0000${c.entry.pos}`;
      let grp = byPair.get(key);
      if (!grp) {
        grp = { lemma: c.entry.lemma, pos: c.entry.pos, votes: 0, best: c };
        byPair.set(key, grp);
      }
      grp.votes += 1;
      if (c.bookIndex < grp.best.bookIndex) grp.best = c;
    }

    const ranked = [...byPair.values()].sort((a, b) => {
      if (b.votes !== a.votes) return b.votes - a.votes;
      const lc = String(a.lemma).localeCompare(String(b.lemma), "es");
      if (lc !== 0) return lc;
      const pc = String(a.pos).localeCompare(String(b.pos));
      if (pc !== 0) return pc;
      return a.best.bookIndex - b.best.bookIndex;
    });
    merged.set(form, ranked[0].best.entry);
  }
  return merged;
}

/** Step 3: most-voted POS among a lemma's raw candidates; noisy only if forced. */
function chooseDisplayPos(candidates) {
  const tally = (pool) => {
    const counts = new Map();
    for (const c of pool) {
      const p = c.entry.pos;
      counts.set(p, (counts.get(p) || 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return String(a[0]).localeCompare(String(b[0]));
    });
  };
  const nonNoisy = candidates.filter((c) => !isNoisy(c.entry));
  const pool = nonNoisy.length > 0 ? nonNoisy : candidates;
  const ranked = tally(pool);
  return ranked.length > 0 ? ranked[0][0] : null;
}

/** Step 4: pick the display entry for a lemma by the documented preference order. */
function pickDisplay(candidates, lemma, displayPos) {
  return [...candidates].sort((x, y) => {
    const ax = x.form === lemma ? 0 : 1;
    const ay = y.form === lemma ? 0 : 1;
    if (ax !== ay) return ax - ay;

    const bx = x.entry.pos === displayPos ? 0 : 1;
    const by = y.entry.pos === displayPos ? 0 : 1;
    if (bx !== by) return bx - by;

    const cx = x.entry.ru ? 0 : 1;
    const cy = y.entry.ru ? 0 : 1;
    if (cx !== cy) return cx - cy;

    const dx = x.entry.ipa ? 0 : 1;
    const dy = y.entry.ipa ? 0 : 1;
    if (dx !== dy) return dx - dy;

    if (x.bookIndex !== y.bookIndex) return x.bookIndex - y.bookIndex;
    return x.form.localeCompare(y.form, "es");
  })[0];
}

/**
 * Steps 2–4: count each lemma across all tokens, choose its display POS and
 * entry. `books` is `[{ id, glosses, tokens }]`; token elements may be plain
 * strings or `{ t, w }` objects.
 */
export function countLemmaFrequency(books) {
  const merged = mergeGlossaries(books.map((b) => b.glosses));

  const counts = new Map();
  for (const book of books) {
    for (const el of book.tokens) {
      const w = typeof el === "string" ? el : el.w;
      if (!w) continue;
      const gloss = merged.get(w);
      if (!gloss || !gloss.lemma) continue;
      counts.set(gloss.lemma, (counts.get(gloss.lemma) || 0) + 1);
    }
  }

  const byLemma = new Map();
  books.forEach((book, bookIndex) => {
    for (const form of Object.keys(book.glosses)) {
      const entry = book.glosses[form];
      if (!entry || !entry.lemma) continue;
      if (!byLemma.has(entry.lemma)) byLemma.set(entry.lemma, []);
      byLemma.get(entry.lemma).push({ form, entry, bookIndex });
    }
  });

  const result = new Map();
  for (const [lemma, count] of counts) {
    const candidates = byLemma.get(lemma) || [];
    if (candidates.length === 0) continue;
    const pos = chooseDisplayPos(candidates);
    const ref = pickDisplay(candidates, lemma, pos).entry;
    result.set(lemma, { lemma, count, pos, ref });
  }
  return result;
}

function normaliseIpa(ipa) {
  if (!ipa) return null;
  let v = String(ipa).trim();
  if (v.startsWith("[") && v.endsWith("]")) v = v.slice(1, -1).trim();
  if (!v) return null;
  if (!v.includes("/")) v = `/${v}/`;
  return v;
}

/** Step 5: rank lemmas, group by Russian POS label, return a WordCategory. */
export function buildFrequencyCategory(freq, options = {}) {
  const { limit = 200, excludePos = DEFAULT_EXCLUDE_POS } = options;

  const ranked = [...freq.values()]
    .filter((f) => !excludePos.includes(f.pos))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.lemma.localeCompare(b.lemma, "es");
    })
    .slice(0, limit);

  const byLabel = new Map();
  for (const f of ranked) {
    const label = POS_RU[f.pos] ?? f.pos;
    if (!byLabel.has(label)) byLabel.set(label, []);
    byLabel.get(label).push({
      es: f.lemma,
      ipa: normaliseIpa(f.ref.ipa),
      pos: label,
      ru: f.ref.ru ?? null,
      example: null,
      grammar: f.ref.grammar ?? null,
      note: "вхождений в корпусе: " + f.count.toLocaleString("ru-RU"),
      _count: f.count,
    });
  }

  const groups = [...byLabel.entries()]
    .map(([title, items]) => {
      const total = items.reduce((n, i) => n + i._count, 0);
      items.sort((a, b) => {
        if (b._count !== a._count) return b._count - a._count;
        return a.es.localeCompare(b.es, "es");
      });
      return {
        title,
        total,
        items: items.map(({ _count, ...item }) => item),
      };
    })
    .sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total;
      return a.title.localeCompare(b.title, "es");
    })
    .map(({ total, ...group }) => group);

  return {
    id: "frequency",
    lang: "es",
    title: {
      ru: "Частотные слова из книг",
      en: "Frequent words from the books",
    },
    groups,
  };
}
