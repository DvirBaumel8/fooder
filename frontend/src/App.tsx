import { useEffect, useState } from "react";
import { useListQuery, useCompleteItem, useDeleteItem } from "./api/list";
import { useShopsQuery } from "./api/shops";
import { useListEvents } from "./api/useListEvents";
import { ItemCard } from "./components/ItemCard";
import { AddItemSheet } from "./components/AddItemSheet";
import { ShopTabs } from "./components/ShopTabs";
import { ProfileSwitcher, useProfile } from "./components/ProfileSwitcher";

export default function App() {
  useListEvents();
  const [profile, setProfile] = useProfile();
  const { data: items, isLoading, isError, refetch } = useListQuery();
  const { data: shops } = useShopsQuery();
  const completeItem = useCompleteItem();
  const deleteItem = useDeleteItem();
  const [isAdding, setIsAdding] = useState(false);
  const [activeShopId, setActiveShopId] = useState<string | null>(null);

  useEffect(() => {
    if (!activeShopId && shops && shops.length > 0) {
      setActiveShopId(shops[0].id);
    }
  }, [shops, activeShopId]);

  const visibleItems = items?.filter((item) => item.shop.id === activeShopId);

  return (
    <div className="min-h-screen bg-slate-50 p-4 text-slate-900">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">היי, {profile}</h1>
        <ProfileSwitcher profile={profile} onChange={setProfile} />
      </div>

      <ShopTabs activeShopId={activeShopId} onSelect={setActiveShopId} />

      {isLoading && <p>טוען...</p>}

      {isError && (
        <div className="mb-4 rounded-md border border-red-300 bg-red-50 p-3 text-red-700">
          <p>שגיאה בטעינת הרשימה. אירעה שגיאה, נסה שוב.</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-2 rounded-md bg-red-600 px-3 py-1 text-sm text-white"
          >
            נסה שוב
          </button>
        </div>
      )}

      {!isError && (
        <ul className="flex flex-col gap-2">
          {visibleItems?.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              onComplete={(id) => completeItem.mutate(id)}
              onDelete={(id) => deleteItem.mutate(id)}
            />
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={() => setIsAdding(true)}
        disabled={!activeShopId}
        className="fixed bottom-6 left-6 h-14 w-14 rounded-full bg-blue-600 text-2xl text-white shadow-lg disabled:opacity-50"
      >
        +
      </button>

      {isAdding && activeShopId && (
        <AddItemSheet shopId={activeShopId} onClose={() => setIsAdding(false)} />
      )}
    </div>
  );
}
