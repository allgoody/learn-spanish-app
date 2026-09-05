import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import HeaderMenu from "../../src/components/HeaderMenu";

describe("HeaderMenu", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
  });

  it("is closed by default", () => {
    render(<HeaderMenu />);
    const btn = screen.getByRole("button", { name: "Меню" });
    expect(btn).toHaveAttribute("aria-expanded", "false");
    expect(
      screen.queryByRole("group", { name: "Язык приложения" }),
    ).not.toBeInTheDocument();
  });

  it("opens and closes on hamburger click", async () => {
    const user = userEvent.setup();
    render(<HeaderMenu />);
    const btn = screen.getByRole("button", { name: "Меню" });

    await user.click(btn);
    expect(btn).toHaveAttribute("aria-expanded", "true");
    expect(
      screen.getByRole("group", { name: "Язык приложения" }),
    ).toBeInTheDocument();

    await user.click(btn);
    expect(btn).toHaveAttribute("aria-expanded", "false");
    expect(
      screen.queryByRole("group", { name: "Язык приложения" }),
    ).not.toBeInTheDocument();
  });

  it("closes on outside click", async () => {
    const user = userEvent.setup();
    render(<HeaderMenu />);
    await user.click(screen.getByRole("button", { name: "Меню" }));

    await user.click(document.body);
    expect(
      screen.queryByRole("group", { name: "Язык приложения" }),
    ).not.toBeInTheDocument();
  });

  it("closes on Escape and returns focus to the button", async () => {
    const user = userEvent.setup();
    render(<HeaderMenu />);
    const btn = screen.getByRole("button", { name: "Меню" });
    await user.click(btn);

    await user.keyboard("{Escape}");
    expect(btn).toHaveAttribute("aria-expanded", "false");
    expect(btn).toHaveFocus();
  });

  it("switches theme, persists it, and applies the attribute", async () => {
    const user = userEvent.setup();
    render(<HeaderMenu />);
    await user.click(screen.getByRole("button", { name: "Меню" }));

    await user.click(screen.getByRole("button", { name: "Тёмная" }));
    expect(screen.getByRole("button", { name: "Тёмная" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(localStorage.getItem("theme")).toBe("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("switches app language and re-renders the menu labels", async () => {
    const user = userEvent.setup();
    render(<HeaderMenu />);
    await user.click(screen.getByRole("button", { name: "Меню" }));

    await user.click(screen.getByRole("button", { name: "English" }));
    expect(localStorage.getItem("lang")).toBe("en");
    expect(
      screen.getByRole("group", { name: "App language" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dark" })).toBeInTheDocument();
  });
});
