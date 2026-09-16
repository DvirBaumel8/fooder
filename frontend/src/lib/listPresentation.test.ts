import { filterAndSortItems } from "./listPresentation";
import type { ShoppingListItem } from "../api/types";

const items: ShoppingListItem[] = [
  {
    id: "milk",
    quantity: "2",
    note: "במקרר, ללא לקטוז",
    createdAt: "2026-09-16T10:00:00.000Z",
    product: {
      id: "product-milk",
      name: "חלב",
      category: "חלב ומוצריו",
      photoUrl: null,
    },
    shop: { id: "shop-main", name: "הסופר שלי" },
  },
  {
    id: "bread",
    quantity: "1",
    note: null,
    createdAt: "2026-09-16T11:00:00.000Z",
    product: {
      id: "product-bread",
      name: "באגט",
      category: "מאפים",
      photoUrl: null,
    },
    shop: { id: "shop-main", name: "הסופר שלי" },
  },
];

it("matches a normalized Hebrew product name, category, quantity, or note", () => {
  expect(filterAndSortItems(items, "חלב", "newest").map(({ id }) => id)).toEqual(["milk"]);
  expect(filterAndSortItems(items, "מקרר", "newest").map(({ id }) => id)).toEqual(["milk"]);
  expect(filterAndSortItems(items, "2", "newest").map(({ id }) => id)).toEqual(["milk"]);
  expect(filterAndSortItems(items, "ללא לקטוז", "newest").map(({ id }) => id)).toEqual(["milk"]);
});

it("sorts matching items by name and category without mutating the source", () => {
  const original = [...items];

  expect(filterAndSortItems(items, "", "name").map(({ id }) => id)).toEqual(["bread", "milk"]);
  expect(filterAndSortItems(items, "", "category").map(({ id }) => id)).toEqual(["milk", "bread"]);
  expect(items).toEqual(original);
});

it("returns no items when a query has no match", () => {
  expect(filterAndSortItems(items, "פסטה", "newest")).toEqual([]);
});
