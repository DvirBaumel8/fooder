import type { ShoppingListItem } from "../api/types";

export type ListSort = "newest" | "name" | "category";

export function filterAndSortItems(items: ShoppingListItem[], query: string, sort: ListSort) {
  const normalizedQuery = query.trim().toLocaleLowerCase("he");
  const matching = items.filter((item) =>
    [item.product.name, item.product.category, item.quantity, item.note]
      .filter((value): value is string => Boolean(value))
      .some((value) => value.toLocaleLowerCase("he").includes(normalizedQuery))
  );

  return [...matching].sort((left, right) => {
    if (sort === "name") return left.product.name.localeCompare(right.product.name, "he");
    if (sort === "category") {
      return (left.product.category ?? "").localeCompare(right.product.category ?? "", "he") || left.product.name.localeCompare(right.product.name, "he");
    }
    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
  });
}
