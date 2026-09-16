import { useMemo } from "react";
import type { ShoppingListItem } from "../api/types";
import { filterAndSortItems, type ListSort } from "../lib/listPresentation";
import { ItemCard } from "./ItemCard";

interface ShoppingListProps {
  items: ShoppingListItem[];
  query: string;
  sort: ListSort;
  onComplete: (id: string) => void;
  onEdit: (item: ShoppingListItem) => void;
  onDelete: (id: string) => void;
}

export function ShoppingList({ items, query, sort, onComplete, onEdit, onDelete }: ShoppingListProps) {
  const visibleItems = useMemo(() => filterAndSortItems(items, query, sort), [items, query, sort]);

  if (items.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon" aria-hidden="true">✦</div>
        <h2>אין פריטים ברשימה</h2>
        <p>הוסיפו פריט כשמשהו מתחיל להיגמר.</p>
      </div>
    );
  }

  if (visibleItems.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon" aria-hidden="true">✦</div>
        <h2>לא נמצאו פריטים</h2>
        <p>חפשו מונח אחר או הוסיפו פריט חדש.</p>
      </div>
    );
  }

  return (
    <ul className="item-list">
      {visibleItems.map((item) => (
        <ItemCard key={item.id} item={item} onComplete={onComplete} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </ul>
  );
}
