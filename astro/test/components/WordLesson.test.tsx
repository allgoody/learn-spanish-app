import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import WordLesson from "../../src/components/WordLesson";
import { categories } from "../../src/lib/words";

describe("WordLesson", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders the lesson title and the back link", () => {
    render(<WordLesson category={categories[0]} />);
    expect(
      screen.getByRole("heading", { name: "Местоимения" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "← На главную" })).toHaveAttribute(
      "href",
      "/",
    );
  });

  it("renders a word with its inline gloss", () => {
    render(<WordLesson category={categories[0]} />);
    expect(screen.getByText("yo")).toBeInTheDocument();
    expect(screen.getByText("/ʝo/")).toBeInTheDocument();
    expect(screen.getByText("я")).toBeInTheDocument();
    expect(screen.getByText("Yo hablo español.")).toBeInTheDocument();
    expect(screen.getByText("— Я говорю по-испански.")).toBeInTheDocument();
  });
});
