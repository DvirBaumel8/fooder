import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { ListToolbar } from "./ListToolbar";
import { renderWithClient } from "../test/render";

it("updates search and chooses a visible sort option", async () => {
  const user = userEvent.setup();
  const onSearchChange = vi.fn();
  const onSortChange = vi.fn();

  renderWithClient(
    <ListToolbar
      shopName="ניצת הדובדבן"
      value=""
      onSearchChange={onSearchChange}
      sort="newest"
      onSortChange={onSortChange}
    />,
  );

  await user.type(screen.getByRole("searchbox", { name: "חיפוש ברשימת ניצת הדובדבן" }), "חלב");
  const sortButton = screen.getByRole("button", { name: "מיון: חדש ביותר" });
  expect(sortButton).toHaveAttribute("aria-label", "מיון: חדש ביותר");

  await user.click(sortButton);
  await user.click(screen.getByRole("menuitemradio", { name: "לפי שם" }));

  expect(onSearchChange).toHaveBeenLastCalledWith("חלב");
  expect(onSortChange).toHaveBeenCalledWith("name");
});

it("closes the sort options when Escape is pressed", async () => {
  const user = userEvent.setup();

  renderWithClient(
    <ListToolbar
      shopName="ניצת הדובדבן"
      value=""
      onSearchChange={vi.fn()}
      sort="newest"
      onSortChange={vi.fn()}
    />,
  );

  const sortButton = screen.getByRole("button", { name: "מיון: חדש ביותר" });
  await user.click(sortButton);
  await user.keyboard("{Escape}");

  expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  expect(sortButton).toHaveAttribute("aria-expanded", "false");
});

it("closes the sort options when the user taps outside the menu", async () => {
  const user = userEvent.setup();

  renderWithClient(
    <ListToolbar
      shopName="ניצת הדובדבן"
      value=""
      onSearchChange={vi.fn()}
      sort="newest"
      onSortChange={vi.fn()}
    />,
  );

  await user.click(screen.getByRole("button", { name: "מיון: חדש ביותר" }));
  expect(screen.getByRole("menu")).toBeVisible();

  await user.click(document.body);

  expect(screen.queryByRole("menu")).not.toBeInTheDocument();
});

it("renders a visible search label that explains the field's purpose", () => {
  renderWithClient(
    <ListToolbar
      shopName="ניצת הדובדבן"
      value=""
      onSearchChange={vi.fn()}
      sort="newest"
      onSortChange={vi.fn()}
    />,
  );

  expect(screen.getByText("חיפוש ברשימה")).toBeVisible();
});

it("returns focus to the sort trigger when Escape closes a focused sort option", async () => {
  const user = userEvent.setup();

  renderWithClient(
    <ListToolbar
      shopName="ניצת הדובדבן"
      value=""
      onSearchChange={vi.fn()}
      sort="newest"
      onSortChange={vi.fn()}
    />,
  );

  const sortButton = screen.getByRole("button", { name: "מיון: חדש ביותר" });
  await user.click(sortButton);
  await user.tab();
  expect(screen.getByRole("menuitemradio", { name: "חדש ביותר" })).toHaveFocus();

  await user.keyboard("{Escape}");

  expect(sortButton).toHaveFocus();
});

it("returns focus to the sort trigger after selecting a sort option", async () => {
  const user = userEvent.setup();

  renderWithClient(
    <ListToolbar
      shopName="ניצת הדובדבן"
      value=""
      onSearchChange={vi.fn()}
      sort="newest"
      onSortChange={vi.fn()}
    />,
  );

  const sortButton = screen.getByRole("button", { name: "מיון: חדש ביותר" });
  await user.click(sortButton);
  await user.click(screen.getByRole("menuitemradio", { name: "לפי שם" }));

  expect(sortButton).toHaveFocus();
});
