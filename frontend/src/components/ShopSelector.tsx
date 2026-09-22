import { useEffect, useId, useRef, useState } from "react";
import { useAddShop, useShopsQuery } from "../api/shops";

interface ShopSelectorProps {
  activeShopId: string | null;
  onSelect: (shopId: string) => void;
}

export function ShopSelector({ activeShopId, onSelect }: ShopSelectorProps) {
  const { data: shops } = useShopsQuery();
  const addShop = useAddShop();
  const [isOpen, setIsOpen] = useState(false);
  const [isAddingShop, setIsAddingShop] = useState(false);
  const [newShopName, setNewShopName] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const selectedOptionRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const dialogTitleId = useId();
  const activeShop = shops?.find((shop) => shop.id === activeShopId);

  useEffect(() => {
    if (!isOpen) return;
    if (isAddingShop) {
      nameInputRef.current?.focus();
      return;
    }
    if (selectedOptionRef.current) {
      selectedOptionRef.current.focus();
    } else {
      dialogRef.current?.focus();
    }
  }, [isAddingShop, isOpen, activeShopId, shops]);

  function getDialogFocusableElements() {
    return Array.from(
      dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
      ) ?? []
    ).filter((element) => element.tabIndex >= 0);
  }

  function focusAndSelectOption(index: number) {
    if (!shops || shops.length === 0) return;
    const nextIndex = (index + shops.length) % shops.length;
    const nextShop = shops[nextIndex];
    onSelect(nextShop.id);
    optionRefs.current[nextIndex]?.focus();
  }

  function handleListboxKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (!shops || shops.length === 0) return;
    const selectedIndex = shops.findIndex((shop) => shop.id === activeShopId);
    const currentIndex = selectedIndex === -1 ? 0 : selectedIndex;

    // In RTL, ArrowLeft advances through the DOM order and ArrowRight moves
    // backward, matching the visual order users had in the previous selector.
    switch (event.key) {
      case "ArrowLeft":
        event.preventDefault();
        focusAndSelectOption(currentIndex + 1);
        break;
      case "ArrowRight":
        event.preventDefault();
        focusAndSelectOption(currentIndex - 1);
        break;
      case "Home":
        event.preventDefault();
        focusAndSelectOption(0);
        break;
      case "End":
        event.preventDefault();
        focusAndSelectOption(shops.length - 1);
        break;
      default:
        break;
    }
  }

  function handleDialogKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeDialog({ restoreFocus: true });
      return;
    }

    if (event.key !== "Tab") return;
    const focusableElements = getDialogFocusableElements();
    const firstElement = focusableElements[0];
    const lastElement = focusableElements.at(-1);
    if (!firstElement || !lastElement) return;

    const activeElement = document.activeElement;
    if (event.shiftKey && (activeElement === firstElement || activeElement === dialogRef.current)) {
      event.preventDefault();
      lastElement.focus();
    } else if (!event.shiftKey && (activeElement === lastElement || activeElement === dialogRef.current)) {
      event.preventDefault();
      firstElement.focus();
    }
  }

  function closeDialog({ restoreFocus = false } = {}) {
    setIsOpen(false);
    setIsAddingShop(false);
    setNewShopName("");
    if (restoreFocus) triggerRef.current?.focus();
  }

  function handleCreateShop() {
    const name = newShopName.trim();
    if (!name || addShop.isPending) return;
    addShop.mutate(name, {
      onSuccess: (shop) => {
        onSelect(shop.id);
        closeDialog({ restoreFocus: true });
      },
    });
  }

  return (
    <section className="shop-selector">
      <button
        ref={triggerRef}
        type="button"
        className="shop-selector-trigger"
        aria-label={`החלפת חנות: ${activeShop?.name ?? "בחירת חנות"}`}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(true)}
      >
        <span className="shop-selector-mark" aria-hidden="true" />
        <span>{activeShop?.name ?? "בחירת חנות"}</span>
        <span className="shop-selector-hint">החלפה</span>
      </button>

      {isOpen ? (
        <div
          className="shop-selector-backdrop"
          onMouseDown={(event) => event.target === event.currentTarget && closeDialog({ restoreFocus: true })}
        >
          <div
            ref={dialogRef}
            className="shop-selector-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby={dialogTitleId}
            tabIndex={-1}
            onKeyDown={handleDialogKeyDown}
          >
            <div className="shop-selector-dialog-header">
              <h2 id={dialogTitleId}>בחירת חנות</h2>
              <button
                type="button"
                className="close-button"
                aria-label="סגירת בחירת חנות"
                onClick={() => closeDialog({ restoreFocus: true })}
              >
                ×
              </button>
            </div>

            {isAddingShop ? (
              <div className="shop-selector-form">
                <label htmlFor="new-shop-name">שם החנות החדשה</label>
                <input
                  ref={nameInputRef}
                  id="new-shop-name"
                  value={newShopName}
                  onChange={(event) => setNewShopName(event.target.value)}
                  onKeyDown={(event) => event.key === "Enter" && handleCreateShop()}
                  className="field"
                />
                <div className="shop-selector-actions">
                  <button
                    type="button"
                    onClick={handleCreateShop}
                    disabled={!newShopName.trim() || addShop.isPending}
                    className="button button-primary"
                  >
                    הוסף
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddingShop(false)}
                    className="button button-quiet"
                  >
                    ביטול
                  </button>
                </div>
                {addShop.isError && <p className="form-error">לא הצלחנו להוסיף את החנות. נסו שוב.</p>}
              </div>
            ) : (
              <>
                <div className="shop-selector-options" role="listbox" aria-label="חנויות" onKeyDown={handleListboxKeyDown}>
                  {shops?.map((shop, index) => {
                    const isActive = shop.id === activeShopId;
                    return (
                      <button
                        key={shop.id}
                        ref={(element) => {
                          optionRefs.current[index] = element;
                          if (isActive) selectedOptionRef.current = element;
                        }}
                        type="button"
                        role="option"
                        aria-selected={isActive}
                        tabIndex={isActive ? 0 : -1}
                        className="shop-selector-option"
                        onClick={() => {
                          onSelect(shop.id);
                          closeDialog({ restoreFocus: true });
                        }}
                      >
                        <span>{shop.name}</span>
                        {isActive ? <span aria-hidden="true">✓</span> : null}
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  className="shop-selector-add"
                  onClick={() => setIsAddingShop(true)}
                >
                  <span aria-hidden="true">＋</span> הוספת חנות
                </button>
              </>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
