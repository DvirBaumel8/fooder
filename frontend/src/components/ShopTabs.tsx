import { useEffect, useId, useRef, useState } from "react";
import { useAddShop, useShopsQuery } from "../api/shops";

interface ShopTabsProps {
  activeShopId: string | null;
  onSelect: (shopId: string) => void;
}

export function ShopTabs({ activeShopId, onSelect }: ShopTabsProps) {
  const { data: shops } = useShopsQuery();
  const addShop = useAddShop();
  const [isAddingShop, setIsAddingShop] = useState(false);
  const [newShopName, setNewShopName] = useState("");
  const addTriggerRef = useRef<HTMLButtonElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const popupId = useId();

  useEffect(() => {
    if (isAddingShop) nameInputRef.current?.focus();
  }, [isAddingShop]);

  function closeAddShop({ restoreFocus = false } = {}) {
    setIsAddingShop(false);
    setNewShopName("");
    if (restoreFocus) addTriggerRef.current?.focus();
  }

  function handleCreateShop() {
    const name = newShopName.trim();
    if (!name || addShop.isPending) return;
    addShop.mutate(name, {
      onSuccess: (shop: { id: string }) => {
        onSelect(shop.id);
        closeAddShop({ restoreFocus: true });
      },
    });
  }

  return (
    <section className="shop-panel">
      <div className="shop-scroller" role="tablist" aria-label="בחירת חנות">
        {shops?.map((shop) => {
          const isActive = shop.id === activeShopId;
          return (
            <button
              key={shop.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onSelect(shop.id)}
              className={isActive ? "shop-tab shop-tab-active" : "shop-tab"}
            >
              {shop.name}
            </button>
          );
        })}
      </div>

      <div
        className="shop-add"
        onKeyDown={(event) => {
          if (isAddingShop && event.key === "Escape") closeAddShop({ restoreFocus: true });
        }}
      >
        <button
          ref={addTriggerRef}
          type="button"
          className="shop-add-trigger"
          aria-haspopup="dialog"
          aria-expanded={isAddingShop}
          aria-controls={popupId}
          onClick={() => setIsAddingShop((isOpen) => !isOpen)}
        >
          <span aria-hidden="true">＋</span> הוספת חנות
        </button>

        {isAddingShop ? (
          <div id={popupId} className="shop-add-popover" role="dialog" aria-label="הוספת חנות">
            <input
              ref={nameInputRef}
              value={newShopName}
              onChange={(event) => setNewShopName(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && handleCreateShop()}
              placeholder="שם החנות"
              aria-label="שם החנות החדשה"
              className="field"
            />
            <div className="shop-add-actions">
              <button
                type="button"
                onClick={handleCreateShop}
                disabled={!newShopName.trim() || addShop.isPending}
                className="button button-small button-primary"
              >
                הוסף
              </button>
              <button
                type="button"
                onClick={() => closeAddShop({ restoreFocus: true })}
                className="button button-small button-quiet"
              >
                ביטול
              </button>
            </div>
            {addShop.isError && <p className="form-error">לא הצלחנו להוסיף את החנות. נסו שוב.</p>}
          </div>
        ) : null}
      </div>
    </section>
  );
}
