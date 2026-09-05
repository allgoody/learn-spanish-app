export interface Gloss {
  lemma?: string;
  pos?: string;
  ipa?: string;
  ru: string;
  grammar?: string | null;
  cefr?: string | null;
  modern?: string | null;
  false_friend?: string | null;
  note?: string | null;
}
export interface Token {
  t: string;
  w: string | null;
}
export interface ChapterMeta {
  id: string;
  title: string;
}
export interface BookMeta {
  id: string;
  lang: string;
  title: string;
  author: string;
  source: string;
  chapters: ChapterMeta[];
}
export interface WordEntry {
  es: string;
  ipa?: string | null;
  pos: string;
  ru: string;
  example?: { es: string; ru: string } | null;
  grammar?: string | null;
  note?: string | null;
}
export interface WordGroup {
  title: string;
  note?: string | null;
  items: WordEntry[];
}
export interface WordCategory {
  id: string;
  lang: string;
  title: { ru: string; en: string };
  groups: WordGroup[];
}
export type GlossLibrary = Record<string, Gloss>;
