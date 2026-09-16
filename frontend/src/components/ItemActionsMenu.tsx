import { useEffect, useId, useRef, useState } from "react";

type ItemActionsMenuProps = {
  itemName: string;
  onEdit: () => void;
  onDelete: () => void;
};

export function ItemActionsMenu({ itemName, onEdit, onDelete }: ItemActionsMenuProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const deleteRef = useRef<HTMLButtonElement>(null);
  const popupId = useId();

  useEffect(() => {
    if (isConfirmingDelete) cancelRef.current?.focus();
  }, [isConfirmingDelete]);

  function closeMenu({ restoreFocus = false } = {}) {
    setIsMenuOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  }

  function openDeleteConfirmation() {
    closeMenu();
    setIsConfirmingDelete(true);
  }

  function cancelDelete() {
    setIsConfirmingDelete(false);
    triggerRef.current?.focus();
  }

  function handleDialogKeyDown(event: React.KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      cancelDelete();
      return;
    }

    if (event.key !== "Tab") return;

    const firstControl = cancelRef.current;
    const lastControl = deleteRef.current;
    if (!firstControl || !lastControl) return;

    if (event.shiftKey && document.activeElement === firstControl) {
      event.preventDefault();
      lastControl.focus();
    } else if (!event.shiftKey && document.activeElement === lastControl) {
      event.preventDefault();
      firstControl.focus();
    }
  }

  return (
    <div
      className="item-actions"
      onKeyDown={(event) => {
        if (isMenuOpen && event.key === "Escape") closeMenu({ restoreFocus: true });
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        className="item-actions-trigger"
        aria-label={`פעולות עבור ${itemName}`}
        aria-expanded={isMenuOpen}
        aria-controls={popupId}
        onClick={() => setIsMenuOpen((isOpen) => !isOpen)}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
          <circle cx="5" cy="12" r="1.75" />
          <circle cx="12" cy="12" r="1.75" />
          <circle cx="19" cy="12" r="1.75" />
        </svg>
      </button>

      {isMenuOpen ? (
        <div id={popupId} className="item-actions-menu" role="group" aria-label={`פעולות עבור ${itemName}`}>
          <button
            type="button"
            onClick={() => {
              closeMenu();
              onEdit();
            }}
          >
            עריכה
          </button>
          <button type="button" className="item-actions-delete" onClick={openDeleteConfirmation}>
            מחק
          </button>
        </div>
      ) : null}

      {isConfirmingDelete ? (
        <div className="confirmation-backdrop">
          <section
            className="confirmation-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-label={`מחיקת ${itemName}`}
            onKeyDown={handleDialogKeyDown}
          >
            <h2>למחוק את {itemName}?</h2>
            <p>לא ניתן לבטל את הפעולה לאחר המחיקה.</p>
            <div className="confirmation-actions">
              <button ref={cancelRef} type="button" className="button button-quiet" onClick={cancelDelete}>
                ביטול
              </button>
              <button ref={deleteRef} type="button" className="button button-danger" onClick={onDelete}>
                מחק פריט
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
