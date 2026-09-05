import { getViteConfig } from "astro/config";
import react from "@astrojs/react";

// getViteConfig (not plain defineConfig): the Layout Astro-page test renders
// <HeaderMenu client:load /> through AstroContainer, which needs the React
// server renderer (@astrojs/react/server.js) — and that module imports the
// virtual "astro:react:opts" provided by the @astrojs/react Vite plugin.
// `as any` is required: the `test` field is not part of Astro's nested Vite
// UserConfig type (see audit-add-test skill).
export default getViteConfig(
  {
    test: {
      environment: "jsdom",
      globals: true,
      setupFiles: ["./test/setup.ts"],
    },
  } as any,
  { integrations: [react()] },
);
