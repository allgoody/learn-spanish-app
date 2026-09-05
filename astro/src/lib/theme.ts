export type Theme = "light" | "dark" | "system";

export function getTheme(): Theme {
  if (typeof localStorage === "undefined") return "system";
  const t = localStorage.getItem("theme");
  return t === "light" || t === "dark" ? t : "system";
}

export function applyTheme(t: Theme): void {
  const root = document.documentElement;
  if (t === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", t);
}

const listeners = new Set<(t: Theme) => void>();

export function setTheme(t: Theme): void {
  localStorage.setItem("theme", t);
  applyTheme(t);
  listeners.forEach((cb) => cb(t));
}

export function onThemeChange(cb: (t: Theme) => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
