import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import type { Shop, ShoppingListItem } from "./api/types";
import App from "./App";

const shops: Shop[] = [{ id: "shop-1", name: "הסופר שלי", createdAt: "2024-01-01T00:00:00.000Z" }];

const items: ShoppingListItem[] = [
  {
    id: "item-1",
    quantity: "2",
    note: null,
    createdAt: "2026-09-16T10:00:00.000Z",
    product: { id: "product-1", name: "חלב", category: "מוצרי חלב", photoUrl: null },
    shop: { id: "shop-1", name: "הסופר שלי" },
  },
  {
    id: "item-2",
    quantity: null,
    note: null,
    createdAt: "2026-09-15T10:00:00.000Z",
    product: { id: "product-2", name: "ביצים", category: "מוצרי חלב", photoUrl: null },
    shop: { id: "shop-1", name: "הסופר שלי" },
  },
];

const completeItemMutation = vi.hoisted(() => ({ mutate: vi.fn(), isPending: false }));
const deleteItemMutation = vi.hoisted(() => ({ mutate: vi.fn(), isPending: false }));
const addItemMutation = vi.hoisted(() => ({ mutate: vi.fn(), isPending: false }));

vi.mock("./api/list", () => ({
  useListQuery: () => ({ data: items, isLoading: false, isError: false, refetch: vi.fn() }),
  useCompleteItem: () => completeItemMutation,
  useDeleteItem: () => deleteItemMutation,
  useAddItem: () => addItemMutation,
}));

vi.mock("./api/shops", () => ({
  useShopsQuery: () => ({ data: shops, isError: false, refetch: vi.fn() }),
  useAddShop: () => ({ mutate: vi.fn(), isPending: false, isError: false }),
}));

vi.mock("./api/useListEvents", () => ({ useListEvents: vi.fn() }));

// This Node runtime's built-in `localStorage` global shadows jsdom's and is
// undefined unless a `--localstorage-file` flag is passed, which trips up
// ProfileSwitcher's useProfile hook. Stub a minimal in-memory implementation
// so App can mount; unrelated to the behavior under test in this file.
beforeAll(() => {
  const store = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => store.clear(),
  });
});

beforeEach(() => {
  completeItemMutation.mutate.mockReset();
  deleteItemMutation.mutate.mockReset();
  addItemMutation.mutate.mockReset();
});

it("keeps the item count in sync with the active search filter (finding #5)", async () => {
  const user = userEvent.setup();
  render(<App />);

  expect(await screen.findByText("2", { selector: ".count-badge strong" })).toBeInTheDocument();

  await user.type(screen.getByRole("searchbox", { name: /חיפוש ברשימת/ }), "פסטה");

  expect(await screen.findByText("0", { selector: ".count-badge strong" })).toBeInTheDocument();
  expect(screen.getByText("לא נמצאו פריטים")).toBeVisible();
});

it("shows a Hebrew error toast and leaves the item in place when completing it fails (finding #3)", async () => {
  const user = userEvent.setup();
  completeItemMutation.mutate.mockImplementation((_id, options) => {
    options?.onError?.();
  });

  render(<App />);
  await user.click(await screen.findByRole("button", { name: "סמן את חלב כנקנה" }));

  expect(await screen.findByText("לא הצלחנו לסמן את הפריט כנקנה. נסו שוב.")).toBeVisible();
  expect(screen.getByText("חלב")).toBeVisible();
});

it("shows a Hebrew error toast and closes the confirmation when deleting an item fails (finding #3)", async () => {
  const user = userEvent.setup();
  deleteItemMutation.mutate.mockImplementation((_id, options) => {
    options?.onError?.();
  });

  render(<App />);
  await user.click(await screen.findByRole("button", { name: "פעולות עבור חלב" }));
  await user.click(screen.getByRole("button", { name: "מחק" }));
  await user.click(screen.getByRole("button", { name: "מחק פריט" }));

  expect(await screen.findByText("לא הצלחנו למחוק את הפריט. נסו שוב.")).toBeVisible();
  await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
});

it("moves focus to the list heading after a successful delete instead of leaving it on <body> (finding #4)", async () => {
  const user = userEvent.setup();
  deleteItemMutation.mutate.mockImplementation((_id, options) => {
    options?.onSuccess?.();
  });

  render(<App />);
  await user.click(await screen.findByRole("button", { name: "פעולות עבור חלב" }));
  await user.click(screen.getByRole("button", { name: "מחק" }));
  await user.click(screen.getByRole("button", { name: "מחק פריט" }));

  await waitFor(() =>
    expect(document.activeElement).toBe(screen.getByRole("heading", { name: "הסופר שלי" }))
  );
});

it("shows a Hebrew error toast when restoring a completed item fails (finding #3)", async () => {
  const user = userEvent.setup();
  completeItemMutation.mutate.mockImplementation((_id, options) => {
    options?.onSuccess?.();
  });
  addItemMutation.mutate.mockImplementation((_input, options) => {
    options?.onError?.();
  });

  render(<App />);
  await user.click(await screen.findByRole("button", { name: "סמן את חלב כנקנה" }));
  await screen.findByText("סומן כנקנה");

  await user.click(screen.getByRole("button", { name: "נקנה (1)" }));
  await user.click(screen.getByRole("button", { name: /שחזור.*חלב/ }));

  expect(await screen.findByText("לא הצלחנו לשחזר את הפריט. נסו שוב.")).toBeVisible();
});
