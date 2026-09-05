import pronouns from "../data/words/pronouns.json";
import type { WordCategory } from "./types";

export const languages: { id: string; name: string }[] = [
  { id: "es", name: "Español" },
];

export const categories: WordCategory[] = [pronouns];

export function getCategory(id: string): WordCategory | undefined {
  return categories.find((c) => c.id === id);
}
