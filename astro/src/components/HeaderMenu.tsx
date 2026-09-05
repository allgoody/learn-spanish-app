import { useEffect, useRef, useState } from "react";
import {
  getLang,
  setLang,
  onLangChange,
  strings,
  type Lang,
} from "../lib/i18n";
import { getTheme, setTheme, onThemeChange, type Theme } from "../lib/theme";

const LANGS: Lang[] = ["ru", "en"];
const THEMES: Theme[] = ["light", "dark", "system"];

export default function HeaderMenu() {
  const [open, setOpen] = useState(false);
  const [lang, setLangState] = useState<Lang>("ru");
  const [theme, setThemeState] = useState<Theme>("system");
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLangState(getLang());
    setThemeState(getTheme());
    const offLang = onLangChange(setLangState);
    const offTheme = onThemeChange(setThemeState);
    return () => {
      offLang();
      offTheme();
    };
  }, []);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || btnRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        setOpen(false);
        btnRef.current?.focus();
      }
    };
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const s = strings[lang];
  const seg = (active: boolean) =>
    `flex-1 rounded px-2 py-1.5 text-xs font-medium transition-colors ${
      active
        ? "bg-accent text-on-accent"
        : "border border-line-strong text-ink hover:bg-surface-hover"
    }`;

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls="header-menu"
        onClick={() => setOpen((o) => !o)}
        className="flex h-8 w-8 items-center justify-center rounded border border-line-strong text-ink hover:bg-surface-hover"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          aria-hidden="true"
        >
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
        <span className="sr-only">{s.menu}</span>
      </button>
      {open && (
        <div
          ref={panelRef}
          id="header-menu"
          className="absolute right-0 top-full z-50 mt-2 w-60 rounded-lg border border-line bg-paper p-3 shadow-lg"
        >
          <div role="group" aria-label={s.appLanguage}>
            <div className="text-xs font-semibold text-muted">
              {s.appLanguage}
            </div>
            <div className="mt-1.5 flex gap-1.5">
              {LANGS.map((l) => (
                <button
                  key={l}
                  type="button"
                  aria-pressed={lang === l}
                  onClick={() => setLang(l)}
                  className={seg(lang === l)}
                >
                  {l === "ru" ? "Русский" : "English"}
                </button>
              ))}
            </div>
          </div>
          <div
            role="group"
            aria-label={s.colorTheme}
            className="mt-3 border-t border-line pt-3"
          >
            <div className="text-xs font-semibold text-muted">
              {s.colorTheme}
            </div>
            <div className="mt-1.5 flex gap-1.5">
              {THEMES.map((t) => (
                <button
                  key={t}
                  type="button"
                  aria-pressed={theme === t}
                  onClick={() => setTheme(t)}
                  className={seg(theme === t)}
                >
                  {s[t]}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
