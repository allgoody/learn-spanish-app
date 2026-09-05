import "@testing-library/jest-dom/vitest";

// jsdom does not implement matchMedia; Reader.tsx calls it on mount to pick
// the desktop popup vs mobile bottom-sheet variant. Guarded for the node
// environment (Layout Astro-page test runs with // @vitest-environment node).
if (typeof window !== "undefined" && typeof window.matchMedia !== "function") {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
}
