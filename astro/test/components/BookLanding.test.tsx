import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import BookLanding from "../../src/components/BookLanding";
import { books } from "../../src/lib/books";

describe("BookLanding", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders the book title and the back link", () => {
    render(<BookLanding book={books[0]} />);
    expect(
      screen.getByRole("heading", { name: "Andanzas y visiones españolas" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "← Все книги" })).toHaveAttribute(
      "href",
      "/",
    );
  });

  it("links to the first chapter", () => {
    render(<BookLanding book={books[0]} />);
    expect(screen.getByRole("link", { name: "Prólogo" })).toHaveAttribute(
      "href",
      "/books/andanzas/prologo",
    );
  });
});
