import pronouns from "../data/words/pronouns.json";
import coreVerbs from "../data/words/core-verbs.json";
import prepositions from "../data/words/prepositions.json";
import conjunctions from "../data/words/conjunctions.json";
import adverbs from "../data/words/adverbs.json";
import numbers from "../data/words/numbers.json";
import interjections from "../data/words/interjections.json";
import frequency from "../data/words/frequency.json";
import type { WordCategory } from "./types";

export const languages: { id: string; name: string }[] = [
  { id: "es", name: "Español" },
];

export const categories: WordCategory[] = [
  pronouns,
  coreVerbs,
  prepositions,
  conjunctions,
  adverbs,
  numbers,
  interjections,
  frequency,
];

export function getCategory(id: string): WordCategory | undefined {
  return categories.find((c) => c.id === id);
}
