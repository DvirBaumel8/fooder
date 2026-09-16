import type { ShoppingListItem } from "../api/types";
import { ItemActionsMenu } from "./ItemActionsMenu";

interface ItemCardProps {
  item: ShoppingListItem;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void | Promise<void>;
  onEdit: (item: ShoppingListItem) => void;
}

export function ItemCard({ item, onComplete, onDelete, onEdit }: ItemCardProps) {
  const metadata = [item.quantity, item.product.category, item.note].filter(Boolean).join(" · ");

  return (
    <li className="item-row">
      <div className="item-copy">
        <p className="item-name">{item.product.name}</p>
        {metadata && <p className="item-meta">{metadata}</p>}
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
