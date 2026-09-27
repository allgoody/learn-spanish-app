// Shared cleaner: drop styles/scripts, restore drop-cap letters from img alt,
// turn block ends into newlines, strip tags and decode entities.
function cleanFragment(raw) {
  let body = raw;
  body = body.replace(/<img[^>]*alt="([^"]*)"[^>]*>/g, "$1");
  body = body.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
  body = body.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
  body = body.replace(/<\/p>/gi, "\n\n");
  body = body.replace(/<br\s*\/?>/gi, "\n");
  body = body.replace(/<[^>]+>/g, "");
  body = body.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
  body = body
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  body = body.replace(/[ \t]+/g, " ");
  body = body
    .split("\n")
    .map((l) => l.trim())
    .join("\n");
  body = body.replace(/\n{3,}/g, "\n\n");
  return body.replace(/^\n+/, "").trim();
}

// Story pages: body sits between the ws-h3-medio heading and the last </p>.
export function extractStoryText(html, pageTitle) {
  const h3 = html.indexOf("ws-h3-medio");
  if (h3 === -1) throw new Error("no ws-h3-medio heading in " + pageTitle);
  const start = html.indexOf("<p>", h3);
  if (start === -1) throw new Error("no <p> after heading in " + pageTitle);
  const end = html.lastIndexOf("</p>") + 4;
  if (end <= start) throw new Error("no story body in " + pageTitle);
  let body = cleanFragment(html.slice(start, end));
  if (!body.endsWith("\n")) body += "\n";
  return body;
}

// Article pages (a whole work on one page, no per-chapter heading): every <p>,
// blank-line separated. Template boxes are divs/tables, so they stay out.
export function extractArticleText(html) {
  const paras = [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)]
    .map((m) => cleanFragment(m[1]))
    .filter(Boolean);
  if (paras.length === 0) throw new Error("no <p> blocks in page");
  return paras.join("\n\n") + "\n";
}

// Split one extracted page into chapters at paragraph markers. A marker is the
// first line of the paragraph that opens the section; that line is dropped when
// it is just the heading (Wikisource often puts the work title on line 1 of the
// opening paragraph).
export function splitSections(text, sections) {
  const paras = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  const marks = [];
  let from = 0;
  for (const s of sections) {
    const idx = paras.findIndex(
      (p, i) => i >= from && p.split("\n")[0].trim() === s.marker,
    );
    if (idx === -1) throw new Error("section marker not found: " + s.marker);
    marks.push(idx);
    from = idx + 1;
  }
  return sections.map((s, i) => {
    const start = marks[i];
    const end = i + 1 < marks.length ? marks[i + 1] : paras.length;
    const body = paras
      .slice(start, end)
      .map((p, j) => {
        if (j !== 0) return p;
        const lines = p.split("\n");
        if (lines[0].trim() !== s.marker) return p;
        return lines.slice(1).join("\n").trim();
      })
      .filter(Boolean);
    return { id: s.id, title: s.title, text: body.join("\n\n") + "\n" };
  });
}
