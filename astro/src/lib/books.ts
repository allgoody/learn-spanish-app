import andanzasMeta from '../data/books/andanzas/meta.json'
import type { BookMeta } from './types'

export const books: BookMeta[] = [andanzasMeta]

export function getBook(id: string): BookMeta | undefined {
  return books.find((b) => b.id === id)
}
