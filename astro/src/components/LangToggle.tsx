import { useState } from "react";
import { getLang, setLang, type Lang } from "../lib/i18n";

export default function LangToggle() {
  const [lang, setState] = useState<Lang>(getLang());
  const next: Lang = lang === "ru" ? "en" : "ru";
  return (
    <button
      type="button"
      onClick={() => {
        setLang(next);
        setState(next);
      }}
      className="text-xs px-2 py-1 rounded border border-stone-300 hover:bg-stone-100"
    >
      {next === "en" ? "EN" : "RU"}
    </button>
  );
}
