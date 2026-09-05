import { describe, it, expect, beforeEach } from "vitest";
import {
  getTheme,
  setTheme,
  applyTheme,
  onThemeChange,
} from "../../src/lib/theme";

describe("theme", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
  });

  it("defaults to system when nothing is stored", () => {
    expect(getTheme()).toBe("system");
  });

  it("returns the stored theme when it is valid", () => {
    localStorage.setItem("theme", "dark");
    expect(getTheme()).toBe("dark");
  });

  it("falls back to system for an invalid stored value", () => {
    localStorage.setItem("theme", "blue");
    expect(getTheme()).toBe("system");
  });

  it("setTheme persists, applies the attribute, and notifies listeners", () => {
    const seen: string[] = [];
    const off = onThemeChange((t) => seen.push(t));
    setTheme("dark");
    expect(localStorage.getItem("theme")).toBe("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(seen).toEqual(["dark"]);
    off();
  });

  it("applyTheme removes the attribute for system", () => {
    document.documentElement.setAttribute("data-theme", "dark");
    applyTheme("system");
    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
  });

  it("unsubscribing stops notifications", () => {
    const seen: string[] = [];
    const off = onThemeChange((t) => seen.push(t));
    off();
    setTheme("light");
    expect(seen).toEqual([]);
  });
});
