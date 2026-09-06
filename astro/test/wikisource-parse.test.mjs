import { describe, it, expect } from "vitest";
import { extractStoryText } from "../scripts/lib/wikisource-parse.mjs";

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
