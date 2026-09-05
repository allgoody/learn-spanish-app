// Global ambient declaration for .astro imports in tests (plain tsc needs a
// script file, not a module, for wildcard module declarations to apply).
declare module "*.astro" {
  const Component: import("astro/runtime/server").AstroComponentFactory;
  export default Component;
}
