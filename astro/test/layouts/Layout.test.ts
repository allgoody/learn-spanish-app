// @vitest-environment node
// Node environment (not jsdom): vitest then transforms this file through the
// SSR vite environment, where the astro plugin compiles .astro server-side
// instead of emitting the client-side "Astro components cannot be used in the
// browser" stub. Required for AstroContainer to render Layout.astro.
import { describe, it, expect } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import reactRenderer from "@astrojs/react/server.js";
import Layout from "../../src/layouts/Layout.astro";
import { seo, seoLang } from "../../src/lib/seo";

async function renderLayout(
  props: Record<string, unknown> = {},
  slot = "<p>slot content</p>",
): Promise<string> {
  const container = await AstroContainer.create();
  // Layout.astro renders <HeaderMenu client:load />; the container needs the
  // React server renderer to SSR the island (see audit-add-test skill).
  container.addServerRenderer({ renderer: reactRenderer });
  return container.renderToString(Layout, { props, slots: { default: slot } });
}

describe("Layout.astro", () => {
  it("renders title and description props into the head", async () => {
    const html = await renderLayout({
      title: "Тест",
      description: "Описание",
    });
    expect(html).toContain("<title>Тест</title>");
    expect(html).toContain('<meta name="description" content="Описание">');
  });

  it("defaults to the ru home title/description from the seo map", async () => {
    const html = await renderLayout();
    expect(html).toContain(`<title>${seo[seoLang].homeTitle}</title>`);
    expect(html).toContain(
      `<meta name="description" content="${seo[seoLang].homeDescription}">`,
    );
  });

  it("sets html lang and data-content-lang from the contentLang prop", async () => {
    const html = await renderLayout({ contentLang: "ru" });
    expect(html).toContain('<html lang="ru" data-content-lang>');
  });

  it("defaults html lang to the content language (es) without the marker", async () => {
    const html = await renderLayout();
    expect(html).toContain('<html lang="es">');
    // The no-FOUC script mentions data-content-lang, so scope the absence
    // check to the <html> tag itself.
    expect(html).not.toContain('<html lang="es" data-content-lang');
  });

  it("emits the standard head tags: canonical, favicon, og:image", async () => {
    const html = await renderLayout();
    expect(html).toContain('<link rel="canonical"');
    expect(html).toContain(
      '<link rel="icon" type="image/svg+xml" href="/favicon.svg">',
    );
    expect(html).toContain('<meta property="og:image" content="/og.jpg">');
  });

  it("renders the sticky-footer body structure", async () => {
    const html = await renderLayout();
    expect(html).toContain(
      '<body class="min-h-dvh flex flex-col bg-paper text-ink">',
    );
    // Content wrapper is the flex-1 child so the footer anchors to the
    // viewport bottom on short pages.
    expect(html).toContain('<div class="flex-1">');
  });

  it("renders the slot content inside the flex-1 wrapper", async () => {
    const html = await renderLayout({}, "<p>slot content</p>");
    expect(html).toContain('<div class="flex-1"><p>slot content</p></div>');
  });

  it("renders the CTDev footer credit with the /ru/ link and safe attrs", async () => {
    const html = await renderLayout();
    expect(html).toContain(
      '<a href="https://ctdev.dev/ru/" target="_blank" rel="noopener noreferrer" class="text-[0.65rem] text-muted hover:underline">Made by CTDev</a>',
    );
  });

  it("renders the brand link to the home page", async () => {
    const html = await renderLayout();
    expect(html).toContain(
      '<a href="/" class="font-bold text-lg hover:text-accent">Aprende español</a>',
    );
  });

  it("SSR-renders the HeaderMenu island (client:load)", async () => {
    const html = await renderLayout();
    expect(html).toContain("<astro-island");
    expect(html).toContain('client="load"');
    expect(html).toContain("Меню");
  });
});
