export function extractStoryText(html, pageTitle) {
  const h3 = html.indexOf("ws-h3-medio");
  if (h3 === -1) throw new Error("no ws-h3-medio heading in " + pageTitle);
  const start = html.indexOf("<p>", h3);
  if (start === -1) throw new Error("no <p> after heading in " + pageTitle);
  const end = html.lastIndexOf("</p>") + 4;
  if (end <= start) throw new Error("no story body in " + pageTitle);
  let body = html.slice(start, end);
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
  body = body.replace(/^\n+/, "").trim();
  if (!body.endsWith("\n")) body += "\n";
  return body;
}
