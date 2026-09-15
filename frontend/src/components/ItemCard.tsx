import type { ShoppingListItem } from "../api/types";

interface ItemCardProps {
  item: ShoppingListItem;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (item: ShoppingListItem) => void;
}

export function ItemCard({ item, onComplete, onDelete, onEdit }: ItemCardProps) {
  return (
    <li className="item-card">
      {item.product.photoUrl ? (
        <img
          src={item.product.photoUrl}
          alt={item.product.name}
          className="item-photo"
        />
      ) : (
        <div className="item-photo item-photo-empty" aria-hidden="true">🛒</div>
      )}

      <div className="item-copy">
        <p className="item-name">{item.product.name}</p>
        <p className="item-meta">
          {[item.quantity, item.product.category].filter(Boolean).join(" · ")}
        </p>
        {item.note && <p className="item-note">{item.note}</p>}
      </div>

      <button
        type="button"
        onClick={() => onEdit(item)}
        className="button button-quiet button-small"
        aria-label={`ערוך ${item.product.name}`}
      >
        ערוך
      </button>

      <button
        type="button"
        onClick={() => onComplete(item.id)}
        className="button button-complete"
      >
        <span aria-hidden="true">✓</span> נקנה
      </button>
      <button
        type="button"
        onClick={() => onDelete(item.id)}
        className="delete-button"
        aria-label={`מחק ${item.product.name}`}
      >
        ×
      </button>
    </li>
  );
}
