import { describe, it, expect } from "vitest";
import { breadcrumbs } from "../../src/lib/jsonld";

const base = new URL("https://niceio.com/");

describe("breadcrumbs", () => {
  it("builds a positioned BreadcrumbList with absolute urls", () => {
    const bc = breadcrumbs(
      [
        { name: "Главная", path: "/" },
        { name: "Книга", path: "/books/selva/" },
      ],
      base,
    );
    expect(bc["@type"]).toBe("BreadcrumbList");
    expect(bc.itemListElement).toEqual([
      {
        "@type": "ListItem",
        position: 1,
        name: "Главная",
        item: "https://niceio.com/",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Книга",
        item: "https://niceio.com/books/selva/",
      },
    ]);
  });
});
