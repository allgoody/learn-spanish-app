import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import Chooser from "../../src/components/Chooser";
import { books } from "../../src/lib/books";
import { categories } from "../../src/lib/words";

describe("Chooser", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders the language section and section headers", () => {
    render(<Chooser books={books} categories={categories} />);
    expect(
      screen.getByRole("heading", { name: "Español" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Книги" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Категории слов" }),
    ).toBeInTheDocument();
  });

  it("links to the book landing and the words lesson", () => {
    render(<Chooser books={books} categories={categories} />);
    expect(
      screen.getByRole("link", { name: /Andanzas y visiones españolas/ }),
    ).toHaveAttribute("href", "/books/andanzas/");
    expect(screen.getByRole("link", { name: "Местоимения" })).toHaveAttribute(
      "href",
      "/words/pronouns/",
    );
  });
});
