import { useState } from "react";
import type { ShoppingListItem } from "../api/types";
import { ItemActionsMenu } from "./ItemActionsMenu";

interface ItemCardProps {
  item: ShoppingListItem;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void | Promise<void>;
  onEdit: (item: ShoppingListItem) => void;
}

export function ItemCard({ item, onComplete, onDelete, onEdit }: ItemCardProps) {
  const [isPhotoPreviewOpen, setIsPhotoPreviewOpen] = useState(false);
  const metadata = [item.quantity, item.product.category, item.note].filter(Boolean).join(" · ");
  const photoLabel = `תמונה של ${item.product.name}`;

  return (
    <li className="item-row">
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
      <div className="item-copy">
        {item.product.photoUrl ? (
          <button
            type="button"
            className="item-photo-thumbnail"
            aria-label={`פתיחת ${photoLabel}`}
            onClick={() => setIsPhotoPreviewOpen(true)}
          >
            <img src={item.product.photoUrl} alt={photoLabel} />
          </button>
        ) : null}
        <div className="item-copy-text">
          <p className="item-name">{item.product.name}</p>
          {metadata && <p className="item-meta">{metadata}</p>}
        </div>
      </div>
      <ItemActionsMenu
        itemName={item.product.name}
        onEdit={() => onEdit(item)}
        onDelete={() => onDelete(item.id)}
      />
      {isPhotoPreviewOpen && item.product.photoUrl ? (
        <div
          className="photo-preview-backdrop"
          onMouseDown={(event) => event.target === event.currentTarget && setIsPhotoPreviewOpen(false)}
        >
          <section className="photo-preview-dialog" role="dialog" aria-modal="true" aria-label={photoLabel}>
            <button type="button" className="close-button" aria-label={`סגירת ${photoLabel}`} onClick={() => setIsPhotoPreviewOpen(false)}>
              ×
            </button>
            <img src={item.product.photoUrl} alt={photoLabel} />
          </section>
        </div>
      ) : null}
    </li>
  );
}
