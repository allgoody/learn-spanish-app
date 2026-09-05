import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Reader from "../../src/components/Reader";

const glosses = {
  casa: { ru: "дом", pos: "sustantivo", lemma: "casa" },
  andar: { ru: "идти", pos: "verbo", lemma: "andar" },
};

// Mirrors the page markup: every word is a span with data-word,
// tabindex="0" role="button" (glossable spans).
function renderWithText() {
  render(
    <div>
      <span data-word="casa" role="button" tabIndex={0}>
        casa
      </span>
      <span data-word="andar" role="button" tabIndex={0}>
        andar
      </span>
      <Reader glosses={glosses} />
    </div>,
  );
}

describe("Reader (mobile: no hover support)", () => {
  it("opens the bottom sheet when a word is clicked", async () => {
    const user = userEvent.setup();
    renderWithText();

    await user.click(screen.getByRole("button", { name: "casa" }));
    const dialog = screen.getByRole("dialog", { name: "casa" });
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveTextContent("дом");
    expect(dialog).toHaveTextContent("sustantivo");
  });

  it("toggles closed when the same word is clicked again", async () => {
    const user = userEvent.setup();
    renderWithText();
    const word = screen.getByRole("button", { name: "casa" });

    await user.click(word);
    expect(screen.getByRole("dialog", { name: "casa" })).toBeInTheDocument();

    await user.click(word);
    expect(
      screen.queryByRole("dialog", { name: "casa" }),
    ).not.toBeInTheDocument();
  });

  it("switches to another word's gloss when a different word is clicked", async () => {
    const user = userEvent.setup();
    renderWithText();

    await user.click(screen.getByRole("button", { name: "casa" }));
    await user.click(screen.getByRole("button", { name: "andar" }));
    expect(
      screen.queryByRole("dialog", { name: "casa" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "andar" })).toHaveTextContent(
      "идти",
    );
  });

  it("closes on outside click", async () => {
    const user = userEvent.setup();
    renderWithText();
    await user.click(screen.getByRole("button", { name: "casa" }));

    await user.click(document.body);
    expect(
      screen.queryByRole("dialog", { name: "casa" }),
    ).not.toBeInTheDocument();
  });

  it("closes on Escape", async () => {
    const user = userEvent.setup();
    renderWithText();
    await user.click(screen.getByRole("button", { name: "casa" }));

    await user.keyboard("{Escape}");
    expect(
      screen.queryByRole("dialog", { name: "casa" }),
    ).not.toBeInTheDocument();
  });

  it("opens on Enter key", async () => {
    const user = userEvent.setup();
    renderWithText();
    const word = screen.getByRole("button", { name: "casa" });
    word.focus();

    await user.keyboard("{Enter}");
    expect(screen.getByRole("dialog", { name: "casa" })).toHaveTextContent(
      "дом",
    );
  });

  it("opens on Space key", async () => {
    const user = userEvent.setup();
    renderWithText();
    const word = screen.getByRole("button", { name: "casa" });
    word.focus();

    await user.keyboard(" ");
    expect(screen.getByRole("dialog", { name: "casa" })).toHaveTextContent(
      "дом",
    );
  });
});

describe("Reader (desktop: hover supported)", () => {
  it("renders the popup variant when the device supports hover", async () => {
    const orig = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })) as typeof window.matchMedia;
    try {
      const user = userEvent.setup();
      renderWithText();

      await user.click(screen.getByRole("button", { name: "casa" }));
      expect(screen.getByRole("dialog", { name: "casa" })).toHaveTextContent(
        "дом",
      );
    } finally {
      window.matchMedia = orig;
    }
  });
});
