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

  it("renders all 9 group headings", () => {
    render(<WordLesson category={categories[0]} />);
    const headings = screen.getAllByRole("heading", { level: 2 });
    expect(headings).toHaveLength(9);
    expect(headings.map((h) => h.textContent)).toEqual([
      "Личные (подлежащее)",
      "Прямое дополнение (винительный падеж)",
      "Косвенное дополнение (дательный падеж)",
      "Предложные (после предлогов)",
      "Притяжательные",
      "Указательные",
      "Относительные",
      "Вопросительные и восклицательные",
      "Неопределённые",
    ]);
  });

  it("renders one list item per word entry (69 total)", () => {
    render(<WordLesson category={categories[0]} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(69);
  });

  it("renders grammar labels, including repeated ones", () => {
    render(<WordLesson category={categories[0]} />);
    expect(screen.getAllByText("1-е лицо, ед. ч.")).toHaveLength(7);
    expect(screen.getByText("всегда с ударением")).toBeInTheDocument();
  });

  it("renders the unique voseo note", () => {
    render(<WordLesson category={categories[0]} />);
    expect(
      screen.getByText(
        "voseo: употребляется в Аргентине, Уругвае и др. вместо tú",
      ),
    ).toBeInTheDocument();
  });

  it("renders group-level notes", () => {
    render(<WordLesson category={categories[0]} />);
    expect(
      screen.getByText(
        "После предлогов также используются формы подлежащего: para él, para ella, para usted, para nosotros, para vosotros, para ellos.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Краткие формы стоят перед существительным (mi casa); полные — после существительного (un amigo mío) или с артиклем (el mío).",
      ),
    ).toBeInTheDocument();
  });
});
