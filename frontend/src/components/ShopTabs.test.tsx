import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import type { Shop } from "../api/types";
import { ShopTabs } from "./ShopTabs";

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

it("selects a shop from a horizontally scrollable tab list and exposes a labeled create action", async () => {
  const user = userEvent.setup();
  const onSelect = vi.fn();
  render(<ShopTabs activeShopId="shop-1" onSelect={onSelect} />);

  await user.click(await screen.findByRole("tab", { name: "סופר-פארם" }));

  expect(onSelect).toHaveBeenCalledWith("shop-2");
  expect(screen.getByRole("button", { name: "הוספת חנות" })).toBeVisible();
});

it("marks the active shop as selected and keeps the tab list scrollable", () => {
  render(<ShopTabs activeShopId="shop-2" onSelect={vi.fn()} />);

  expect(screen.getByRole("tablist", { name: "בחירת חנות" })).toBeInTheDocument();
  expect(screen.getByRole("tab", { name: "שופרסל" })).toHaveAttribute("aria-selected", "false");
  expect(screen.getByRole("tab", { name: "סופר-פארם" })).toHaveAttribute("aria-selected", "true");
});

it("moves focus and selection between shop tabs with arrow keys, matching RTL visual order", async () => {
  const user = userEvent.setup();
  const onSelect = vi.fn();
  const { rerender } = render(<ShopTabs activeShopId="shop-1" onSelect={onSelect} />);

  const firstTab = screen.getByRole("tab", { name: "שופרסל" });
  const secondTab = screen.getByRole("tab", { name: "סופר-פארם" });

  firstTab.focus();
  expect(firstTab).toHaveFocus();

  // dir="rtl": ArrowLeft moves focus visually left, i.e. forward through DOM order.
  await user.keyboard("{ArrowLeft}");
  expect(onSelect).toHaveBeenCalledWith("shop-2");
  expect(secondTab).toHaveFocus();

  // The parent owns activeShopId; simulate it committing the selection so the
  // roving tabindex reflects reality, as it would in the real controlled app.
  rerender(<ShopTabs activeShopId="shop-2" onSelect={onSelect} />);
  expect(secondTab).toHaveAttribute("tabindex", "0");
  expect(firstTab).toHaveAttribute("tabindex", "-1");

  onSelect.mockClear();

  // ArrowRight moves focus visually right, i.e. backward through DOM order.
  await user.keyboard("{ArrowRight}");
  expect(onSelect).toHaveBeenCalledWith("shop-1");
  expect(firstTab).toHaveFocus();
});

it("moves focus to the first/last shop tab with Home/End", async () => {
  const user = userEvent.setup();
  const onSelect = vi.fn();
  render(<ShopTabs activeShopId="shop-1" onSelect={onSelect} />);

  const firstTab = screen.getByRole("tab", { name: "שופרסל" });
  const secondTab = screen.getByRole("tab", { name: "סופר-פארם" });

  firstTab.focus();

  await user.keyboard("{End}");
  expect(onSelect).toHaveBeenCalledWith("shop-2");
  expect(secondTab).toHaveFocus();

  onSelect.mockClear();

  await user.keyboard("{Home}");
  expect(onSelect).toHaveBeenCalledWith("shop-1");
  expect(firstTab).toHaveFocus();
});

it("creates a shop through the existing create-shop API from the labeled create action", async () => {
  const user = userEvent.setup();
  const onSelect = vi.fn();
  addShopMutation.mutate.mockImplementation((name, options) => {
    options?.onSuccess?.({ id: "shop-3", name, createdAt: "2024-01-03T00:00:00.000Z" });
  });

  render(<ShopTabs activeShopId="shop-1" onSelect={onSelect} />);

  await user.click(screen.getByRole("button", { name: "הוספת חנות" }));
  await user.type(screen.getByRole("textbox", { name: "שם החנות החדשה" }), "רמי לוי");
  await user.click(screen.getByRole("button", { name: "הוסף" }));

  expect(addShopMutation.mutate).toHaveBeenCalledWith("רמי לוי", expect.any(Object));
  expect(onSelect).toHaveBeenCalledWith("shop-3");
});
