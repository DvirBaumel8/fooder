import { useRef, useState } from "react";
import type { ShoppingListItem } from "../api/types";
import { ItemActionsMenu } from "./ItemActionsMenu";

interface ItemCardProps {
  item: ShoppingListItem;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void | Promise<void>;
  onEdit: (item: ShoppingListItem) => void;
}

const SWIPE_COMPLETION_DISTANCE = 72;

export function ItemCard({ item, onComplete, onDelete, onEdit }: ItemCardProps) {
  const [isPhotoPreviewOpen, setIsPhotoPreviewOpen] = useState(false);
  const [swipeStartX, setSwipeStartX] = useState<number | null>(null);
  const [swipeDistance, setSwipeDistance] = useState(0);
  const didMoveRef = useRef(false);
  const suppressClickRef = useRef(false);
  const metadata = [item.quantity, item.product.category, item.note].filter(Boolean).join(" · ");
  const photoLabel = `תמונה של ${item.product.name}`;
  const resetSwipe = () => {
    setSwipeStartX(null);
    setSwipeDistance(0);
    didMoveRef.current = false;
  };

  const handleSwipeStart = (clientX: number) => {
    setSwipeStartX(clientX);
    setSwipeDistance(0);
    didMoveRef.current = false;
  };

  const handleSwipeMove = (clientX: number) => {
    if (swipeStartX === null) return;

    const distance = Math.max(0, swipeStartX - clientX);
    if (distance > 5) didMoveRef.current = true;
    setSwipeDistance(distance);
  };

  const handleSwipeEnd = (clientX: number) => {
    if (swipeStartX === null) return;

    const distance = Math.max(0, swipeStartX - clientX);
    const didMove = didMoveRef.current || distance > 5;
    if (didMove) suppressClickRef.current = true;
    const shouldComplete = distance >= SWIPE_COMPLETION_DISTANCE;
    resetSwipe();
    if (shouldComplete) onComplete(item.id);
  };

  return (
    <li className="item-row">
      <button
        type="button"
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture?.(event.pointerId);
          handleSwipeStart(event.clientX);
        }}
        onPointerMove={(event) => handleSwipeMove(event.clientX)}
        onPointerUp={(event) => handleSwipeEnd(event.clientX)}
        onPointerCancel={resetSwipe}
        onClick={() => {
          if (suppressClickRef.current) {
            suppressClickRef.current = false;
            return;
          }
          onComplete(item.id);
        }}
        className="button-complete complete-slider"
        data-dragging={swipeStartX !== null || undefined}
        aria-label={`סמן את ${item.product.name} כנקנה`}
      >
        <span className="complete-slider-fill" style={{ width: `${Math.min(100, (swipeDistance / SWIPE_COMPLETION_DISTANCE) * 100)}%` }} />
        <span className="complete-slider-label">החליקו לקנייה</span>
        <span className="complete-slider-thumb" aria-hidden="true" style={{ transform: `translateX(-${Math.min(swipeDistance, SWIPE_COMPLETION_DISTANCE)}px)` }}>
          ‹
        </span>
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
