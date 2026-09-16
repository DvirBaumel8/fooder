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
  const selectedOptionRef = useRef<HTMLButtonElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const dialogTitleId = useId();
  const activeShop = shops?.find((shop) => shop.id === activeShopId);

  useEffect(() => {
    if (!isOpen) return;
    if (isAddingShop) {
      nameInputRef.current?.focus();
      return;
    }
    selectedOptionRef.current?.focus();
  }, [isAddingShop, isOpen]);

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
        <div className="shop-selector-backdrop">
          <div
            className="shop-selector-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby={dialogTitleId}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                closeDialog({ restoreFocus: true });
              }
            }}
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
                <div className="shop-selector-options" role="listbox" aria-label="חנויות">
                  {shops?.map((shop) => {
                    const isActive = shop.id === activeShopId;
                    return (
                      <button
                        key={shop.id}
                        ref={isActive ? selectedOptionRef : undefined}
                        type="button"
                        role="option"
                        aria-selected={isActive}
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
