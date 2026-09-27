// JSON-LD helpers shared by pages. Pass `Astro.site` as the base URL.

export interface Crumb {
  name: string;
  path: string;
}

export function breadcrumbs(crumbs: Crumb[], base: URL) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: new URL(c.path, base).href,
    })),
  };
}
