export interface Gloss {
  lemma?: string; pos?: string; ipa?: string; ru: string;
  grammar?: string | null; cefr?: string | null; modern?: string | null;
  false_friend?: string | null; note?: string | null;
}
export interface Token { t: string; w: string | null }
export interface ChapterMeta { id: string; title: string }
export interface BookMeta { id: string; title: string; author: string; source: string; chapters: ChapterMeta[] }
export type GlossLibrary = Record<string, Gloss>
