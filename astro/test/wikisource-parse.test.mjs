import { describe, it, expect } from "vitest";
import {
  extractStoryText,
  extractArticleText,
  splitSections,
} from "../scripts/lib/wikisource-parse.mjs";

const FIXTURE = `<div class="prp-pages-output" lang="es" dir="ltr">
<div class="noprint ws-noexport" id="headertemplate"><div class="wsbox-main">Cuentos de la selva para los niños (1918) de Horacio Quiroga</div></div>
<div id="ws-data" class="ws-noexport" style="display:none"><span class="ws-title">La tortuga gigante</span><span class="ws-year">1918</span><span class="ws-author">Horacio Quiroga</span></div>
<h3><div class="ws-div ws-h3-medio"> LA TORTUGA GIGANTE</div></h3>
<p><style data-mw-deduplicate="TemplateStyles:r1647991">.mw-parser-output .dropinitial{float:left}</style><span class="dropinitial"><img alt="H" src="//upload.wikimedia.org/thumb.jpg"/></span>abía una vez un hombre que vivía en Buenos Aires.&#32;</p>
<p>Y como&#32;<span><span class="pagenum" id="14" title="Página:...pdf/16"></span></span>tenía mucha puntería, cazaba bichos del monte.</p>
<p>El cazador se curó en seguida. &nbsp; Fin.</p>
</div>`;

describe("extractStoryText", () => {
  it("extracts the body, dropping header nav, metadata div and title heading", () => {
    const out = extractStoryText(FIXTURE, "La tortuga gigante");
    expect(out).not.toContain("headertemplate");
    expect(out).not.toContain("ws-data");
    expect(out).not.toContain("ws-title");
    expect(out).not.toContain("LA TORTUGA GIGANTE");
  });

  it("restores the drop-cap letter from the img alt", () => {
    const out = extractStoryText(FIXTURE, "La tortuga gigante");
    expect(
      out.startsWith("Había una vez un hombre que vivía en Buenos Aires."),
    ).toBe(true);
  });

  it("separates paragraphs with blank lines and drops pagenum spans", () => {
    const out = extractStoryText(FIXTURE, "La tortuga gigante");
    expect(out).toContain(
      "Buenos Aires.\n\nY como tenía mucha puntería, cazaba bichos del monte.",
    );
    expect(out).not.toContain("pagenum");
  });

  it("decodes entities and collapses stray spaces", () => {
    const out = extractStoryText(FIXTURE, "La tortuga gigante");
    expect(out).toContain("en seguida. Fin.");
    expect(out).not.toContain("&#");
    expect(out).not.toContain("&nbsp;");
  });

  it("strips the dropinitial style block and keeps the body non-empty", () => {
    const out = extractStoryText(FIXTURE, "La tortuga gigante");
    expect(out).not.toContain("mw-parser-output");
    expect(out).not.toContain("dropinitial");
    expect(out.trim().length).toBeGreaterThan(0);
  });

  it("throws with the page title when the heading is missing", () => {
    expect(() => extractStoryText("<p>solo</p>", "Página rara")).toThrow(
      /Página rara/,
    );
  });
});

const ARTICLE = `<div class="mw-parser-output" lang="es"><style>.ambox{color:red}</style>` +
  `<table class="ambox"><tr><td>Este artículo necesita ser wikificado</td></tr></table>` +
  `<p>San Manuel Bueno, martir</p>` +
  `<p>Prólogo</p>` +
  `<p>En La Nación, de Buenos Aires&#32;publicó un artículo.</p>` +
  `<p>Madrid, 1932.</p>` +
  `<p>San Manuel Bueno, mártir<br/>Ahora que el obispo de la diócesis de Renada anda preocupado.</p>` +
  `<p>Epílogo</p>` +
  `<p>&nbsp;Cómo vino a mis manos este documento.</p></div>`;

describe("extractArticleText", () => {
  it("takes every paragraph, not the template boxes or style blocks", () => {
    const out = extractArticleText(ARTICLE);
    expect(out.startsWith("San Manuel Bueno, martir")).toBe(true);
    expect(out).not.toContain("ambox");
    expect(out).not.toContain("wikificado");
    expect(out).toContain("Madrid, 1932.");
  });

  it("keeps a title line separate from the following text", () => {
    expect(extractArticleText(ARTICLE)).toContain(
      "San Manuel Bueno, mártir\nAhora que el obispo",
    );
  });

  it("decodes entities, collapses spaces and ends with a newline", () => {
    const out = extractArticleText(ARTICLE);
    expect(out).not.toContain("&#");
    expect(out).not.toContain("&nbsp;");
    expect(out).toContain("Cómo vino a mis manos");
    expect(out.endsWith("\n")).toBe(true);
  });

  it("throws when the page has no paragraphs", () => {
    expect(() => extractArticleText("<div>vacío</div>")).toThrow(/no <p>/);
  });
});

describe("splitSections", () => {
  const text = extractArticleText(ARTICLE);
  const sections = [
    { id: "prologo", title: "Prólogo", marker: "Prólogo" },
    {
      id: "novela",
      title: "San Manuel Bueno, mártir",
      marker: "San Manuel Bueno, mártir",
    },
    { id: "epilogo", title: "Epílogo", marker: "Epílogo" },
  ];

  it("drops each heading line and keeps the section body", () => {
    const out = splitSections(text, sections);
    expect(out.map((s) => s.id)).toEqual(["prologo", "novela", "epilogo"]);
    expect(out[0].text).not.toContain("Prólogo");
    expect(out[0].text.startsWith("En La Nación")).toBe(true);
    expect(out[0].text).toContain("Madrid, 1932.");
  });

  it("drops a heading that shares the paragraph with the body", () => {
    const novel = splitSections(text, sections)[1];
    expect(novel.text.startsWith("Ahora que el obispo")).toBe(true);
    expect(novel.text).not.toContain("mártir\nAhora");
  });

  it("gives the last section everything to the end", () => {
    expect(splitSections(text, sections)[2].text).toContain(
      "Cómo vino a mis manos",
    );
  });

  it("throws when a marker is missing", () => {
    expect(() =>
      splitSections(text, [{ id: "x", title: "X", marker: "No existe" }]),
    ).toThrow(/No existe/);
  });
});
