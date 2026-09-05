import type { AstroComponentFactory } from "astro/runtime/server";

declare module "*.astro" {
  const Component: AstroComponentFactory;
  export default Component;
}
