import { useState } from "react";
import { useShopsQuery, useAddShop } from "../api/shops";

interface ShopTabsProps {
  activeShopId: string | null;
  onSelect: (shopId: string) => void;
}

export function ShopTabs({ activeShopId, onSelect }: ShopTabsProps) {
  const { data: shops } = useShopsQuery();
  const addShop = useAddShop();
  const [isAddingShop, setIsAddingShop] = useState(false);
  const [newShopName, setNewShopName] = useState("");

  const handleCreateShop = () => {
    const name = newShopName.trim();
    if (!name || addShop.isPending) return;
    addShop.mutate(name, {
      onSuccess: (shop) => {
        onSelect(shop.id);
        setNewShopName("");
        setIsAddingShop(false);
      },
    });
  };

  const handleCancelAddShop = () => {
    setIsAddingShop(false);
    setNewShopName("");
  };

  return (
    <section className="shop-panel">
      <div className="section-kicker">איפה קונים היום?</div>
      <div className="shop-scroller" role="tablist" aria-label="בחירת חנות">
        {shops?.map((shop) => (
          <button
            key={shop.id}
            type="button"
            role="tab"
            aria-selected={shop.id === activeShopId}
            onClick={() => onSelect(shop.id)}
            className={shop.id === activeShopId ? "shop-chip shop-chip-active" : "shop-chip"}
          >
            <span className="shop-dot" aria-hidden="true" />
            {shop.name}
          </button>
        ))}

      {isAddingShop ? (
        <div className="shop-add-form">
          <input
            autoFocus
            value={newShopName}
            onChange={(e) => setNewShopName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreateShop()}
            placeholder="שם החנות"
            className="field shop-add-input"
          />
          <button
            type="button"
            onClick={handleCreateShop}
            disabled={!newShopName.trim() || addShop.isPending}
            className="button button-small button-primary disabled:opacity-50"
          >
            הוסף
          </button>
          <button
            type="button"
            onClick={handleCancelAddShop}
            className="button button-small button-quiet"
          >
            ✕
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsAddingShop(true)}
          className="shop-chip shop-chip-add"
        >
          <span aria-hidden="true">＋</span> חנות חדשה
        </button>
      )}
      </div>
      {addShop.isError && <p className="form-error">לא הצלחנו להוסיף את החנות. נסו שוב.</p>}
    </section>
  );
}
