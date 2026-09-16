import type { ShoppingListItem } from "../api/types";
import { ItemActionsMenu } from "./ItemActionsMenu";

interface ItemCardProps {
  item: ShoppingListItem;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void | Promise<void>;
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
        <div className="item-photo item-photo-empty" aria-hidden="true">
          <svg viewBox="0 0 24 24" focusable="false">
            <path d="M4 5h2l1.8 9h8.9l2-6H8.2M10 19a1 1 0 1 0 0 2 1 1 0 0 0 0-2m6 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2" />
          </svg>
        </div>
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
        onClick={() => onComplete(item.id)}
        className="button button-complete"
        aria-label={`סמן את ${item.product.name} כנקנה`}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
          <path d="m5 12 4.5 4.5L19 7" />
        </svg>
      </button>
      <ItemActionsMenu
        itemName={item.product.name}
        onEdit={() => onEdit(item)}
        onDelete={() => onDelete(item.id)}
      />
    </li>
  );
}
