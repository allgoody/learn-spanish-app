import andanzasMeta from "../data/books/andanzas/meta.json";
import sanManuelMeta from "../data/books/san-manuel/meta.json";
import selvaMeta from "../data/books/selva/meta.json";
import type { BookMeta } from "./types";

export const books: BookMeta[] = [andanzasMeta, selvaMeta, sanManuelMeta];

export function getBook(id: string): BookMeta | undefined {
  return books.find((b) => b.id === id);
}
