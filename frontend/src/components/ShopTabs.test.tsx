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
