import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import type { Shop } from "../api/types";
import { ShopSelector } from "./ShopSelector";

const shops: Shop[] = [
  { id: "shop-1", name: "שופרסל", createdAt: "2024-01-01T00:00:00.000Z" },
  { id: "shop-2", name: "סופר-פארם", createdAt: "2024-01-02T00:00:00.000Z" },
];

const addShopMutation = vi.hoisted(() => ({
  mutate: vi.fn(),
  isPending: false,
  isError: false,
}));

vi.mock("../api/shops", () => ({
  useShopsQuery: () => ({ data: shops }),
  useAddShop: () => addShopMutation,
}));

beforeEach(() => {
  addShopMutation.mutate.mockReset();
  addShopMutation.isPending = false;
  addShopMutation.isError = false;
});

it("shows only the active shop on the page and selects another shop from its dialog", async () => {
  const user = userEvent.setup();
  const onSelect = vi.fn();
  render(<ShopSelector activeShopId="shop-1" onSelect={onSelect} />);

  await user.click(screen.getByRole("button", { name: "החלפת חנות: שופרסל" }));
  expect(screen.getByRole("dialog", { name: "בחירת חנות" })).toBeVisible();
  await user.click(screen.getByRole("option", { name: "סופר-פארם" }));

  expect(onSelect).toHaveBeenCalledWith("shop-2");
  expect(screen.queryByRole("dialog", { name: "בחירת חנות" })).not.toBeInTheDocument();
});

it("creates a shop from the selection dialog and restores focus to the selector", async () => {
  addShopMutation.mutate.mockImplementation((name, options) => {
    options?.onSuccess?.({ id: "shop-3", name, createdAt: "2026-09-16T00:00:00.000Z" });
  });
  const user = userEvent.setup();
  const onSelect = vi.fn();
  render(<ShopSelector activeShopId="shop-1" onSelect={onSelect} />);
  const trigger = screen.getByRole("button", { name: "החלפת חנות: שופרסל" });

  await user.click(trigger);
  await user.click(screen.getByRole("button", { name: "הוספת חנות" }));
  await user.type(screen.getByRole("textbox", { name: "שם החנות החדשה" }), "רמי לוי");
  await user.click(screen.getByRole("button", { name: "הוסף" }));

  expect(onSelect).toHaveBeenCalledWith("shop-3");
  expect(trigger).toHaveFocus();
});

it("moves focus into the dialog and restores it after Escape", async () => {
  const user = userEvent.setup();
  render(<ShopSelector activeShopId="shop-1" onSelect={vi.fn()} />);
  const trigger = screen.getByRole("button", { name: "החלפת חנות: שופרסל" });

  await user.click(trigger);
  expect(screen.getByRole("option", { name: "שופרסל" })).toHaveFocus();

  await user.keyboard("{Escape}");
  expect(screen.queryByRole("dialog", { name: "בחירת חנות" })).not.toBeInTheDocument();
  expect(trigger).toHaveFocus();
});
