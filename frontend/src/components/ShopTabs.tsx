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
    <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
      {shops?.map((shop) => (
        <button
          key={shop.id}
          type="button"
          onClick={() => onSelect(shop.id)}
          className={
            shop.id === activeShopId
              ? "shrink-0 rounded-full bg-blue-600 px-3 py-1 text-sm text-white"
              : "shrink-0 rounded-full border border-slate-300 px-3 py-1 text-sm"
          }
        >
          {shop.name}
        </button>
      ))}

      {isAddingShop ? (
        <div className="flex shrink-0 items-center gap-1">
          <input
            autoFocus
            value={newShopName}
            onChange={(e) => setNewShopName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreateShop()}
            placeholder="שם החנות"
            className="w-24 rounded-full border border-slate-300 px-2 py-1 text-sm"
          />
          <button
            type="button"
            onClick={handleCreateShop}
            disabled={!newShopName.trim() || addShop.isPending}
            className="rounded-full bg-blue-600 px-2 py-1 text-sm text-white disabled:opacity-50"
          >
            הוסף
          </button>
          <button
            type="button"
            onClick={handleCancelAddShop}
            className="rounded-full border border-slate-300 px-2 py-1 text-sm text-slate-500"
          >
            ✕
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsAddingShop(true)}
          className="shrink-0 rounded-full border border-dashed border-slate-400 px-3 py-1 text-sm text-slate-500"
        >
          +
        </button>
      )}
    </div>
  );
}
