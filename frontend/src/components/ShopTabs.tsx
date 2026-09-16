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
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const popupId = useId();

  useEffect(() => {
    if (isAddingShop) nameInputRef.current?.focus();
  }, [isAddingShop]);

  function closeAddShop({ restoreFocus = false } = {}) {
    setIsAddingShop(false);
    setNewShopName("");
    if (restoreFocus) addTriggerRef.current?.focus();
  }

  function focusAndSelectTab(index: number) {
    if (!shops || shops.length === 0) return;
    const nextIndex = (index + shops.length) % shops.length;
    const nextShop = shops[nextIndex];
    onSelect(nextShop.id);
    tabRefs.current[nextIndex]?.focus();
  }

  function handleTablistKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (!shops || shops.length === 0) return;
    const currentIndex = shops.findIndex((shop) => shop.id === activeShopId);
    const safeIndex = currentIndex === -1 ? 0 : currentIndex;

    // dir="rtl": ArrowLeft moves focus visually left (forward through DOM
    // order), ArrowRight moves focus visually right (backward through DOM
    // order) — matching the WAI-ARIA tabs pattern's guidance to reverse the
    // arrow-key mapping for right-to-left tablists.
    switch (event.key) {
      case "ArrowLeft":
        event.preventDefault();
        focusAndSelectTab(safeIndex + 1);
        break;
      case "ArrowRight":
        event.preventDefault();
        focusAndSelectTab(safeIndex - 1);
        break;
      case "Home":
        event.preventDefault();
        focusAndSelectTab(0);
        break;
      case "End":
        event.preventDefault();
        focusAndSelectTab(shops.length - 1);
        break;
      default:
        break;
    }
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
      <div
        className="shop-scroller"
        role="tablist"
        aria-label="בחירת חנות"
        onKeyDown={handleTablistKeyDown}
      >
        {shops?.map((shop, index) => {
          const isActive = shop.id === activeShopId;
          return (
            <button
              key={shop.id}
              ref={(el) => {
                tabRefs.current[index] = el;
              }}
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
