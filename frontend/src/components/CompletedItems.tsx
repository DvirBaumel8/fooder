import { useState } from "react";
import type { ShoppingListItem } from "../api/types";

interface CompletedItemsProps {
  items: ShoppingListItem[];
  onRestore: (item: ShoppingListItem) => void;
  isRestoring?: boolean;
}

export function CompletedItems({ items, onRestore, isRestoring = false }: CompletedItemsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (items.length === 0) return null;

  return (
    <section className="completed-section">
      <button
        type="button"
        className="completed-toggle"
        aria-expanded={isExpanded}
        aria-controls="completed-list"
        onClick={() => setIsExpanded((current) => !current)}
      >
        <span>פריטים שנקנו ({items.length})</span>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {isExpanded && (
        <ul id="completed-list" className="completed-list">
          {items.map((item) => (
            <li key={item.id} className="completed-entry">
              <span className="completed-name">{item.product.name}</span>
              <button
                type="button"
                className="completed-restore"
                onClick={() => onRestore(item)}
                disabled={isRestoring}
                aria-label={`שחזור ${item.product.name}`}
              >
                שחזור
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
