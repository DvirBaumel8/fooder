import { useEffect, useMemo, useState } from "react";
import { useListQuery, useCompleteItem, useDeleteItem, useAddItem } from "./api/list";
import { useShopsQuery } from "./api/shops";
import { useListEvents } from "./api/useListEvents";
import { ItemCard } from "./components/ItemCard";
import { AddItemSheet } from "./components/AddItemSheet";
import { ShopTabs } from "./components/ShopTabs";
import { ProfileSwitcher, useProfile } from "./components/ProfileSwitcher";
import type { ShoppingListItem } from "./api/types";

export default function App() {
  useListEvents();
  const [profile, setProfile] = useProfile();
  const { data: items, isLoading, isError: isListError, refetch: refetchList } = useListQuery();
  const { data: shops, isError: isShopsError, refetch: refetchShops } = useShopsQuery();
  const isError = isListError || isShopsError;
  const refetch = () => {
    refetchList();
    refetchShops();
  };
  const completeItem = useCompleteItem();
  const deleteItem = useDeleteItem();
  const [isAdding, setIsAdding] = useState(false);
  const [activeShopId, setActiveShopId] = useState<string | null>(null);
  const [recentlyBought, setRecentlyBought] = useState<ShoppingListItem[]>([]);
  const restoreItem = useAddItem();

  useEffect(() => {
    if (!activeShopId && shops && shops.length > 0) {
      setActiveShopId(shops[0].id);
    }
  }, [shops, activeShopId]);

  const visibleItems = useMemo(
    () => items?.filter((item) => item.shop.id === activeShopId) ?? [],
    [items, activeShopId]
  );
  const activeShop = shops?.find((shop) => shop.id === activeShopId);

  const handleComplete = (id: string) => {
    const item = visibleItems.find((entry) => entry.id === id);
    if (!item) return;
    completeItem.mutate(id, {
      onSuccess: () => setRecentlyBought((current) => [item, ...current].slice(0, 3)),
    });
  };

  const handleRestore = (item: ShoppingListItem) => {
    restoreItem.mutate(
      {
        productId: item.product.id,
        shopId: item.shop.id,
        quantity: item.quantity ?? undefined,
        note: item.note ?? undefined,
      },
      {
        onSuccess: () =>
          setRecentlyBought((current) => current.filter((entry) => entry.id !== item.id)),
      }
    );
  };

  return (
    <main className="app-shell">
      <div className="app-container">
        <header className="app-header">
          <div>
            <p className="eyebrow">FOODER · רשימת הקניות שלנו</p>
            <h1>היי, {profile} <span aria-hidden="true">👋</span></h1>
          </div>
        <ProfileSwitcher profile={profile} onChange={setProfile} />
        </header>

        <ShopTabs activeShopId={activeShopId} onSelect={setActiveShopId} />

        {isLoading && <div className="state-card"><span className="spinner" /> טוענים את הרשימה...</div>}

      {isError && (
        <div className="state-card state-error">
          <p>שגיאה בטעינת הרשימה. אירעה שגיאה, נסה שוב.</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="button button-primary"
          >
            נסה שוב
          </button>
        </div>
      )}

      {!isError && !isLoading && (
        <>
          <section className="list-summary">
            <div>
              <p className="section-kicker">הרשימה שלך</p>
              <h2>{activeShop?.name ?? "החנות"}</h2>
            </div>
            <div className="count-badge"><strong>{visibleItems.length}</strong><span>{visibleItems.length === 1 ? "פריט" : "פריטים"}</span></div>
          </section>
          {visibleItems.length > 0 ? <ul className="item-list">
          {visibleItems.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              onComplete={handleComplete}
              onDelete={(id) => deleteItem.mutate(id)}
            />
          ))}
          </ul> : <div className="empty-state"><div className="empty-icon">✦</div><h2>העגלה ריקה, איזה כיף</h2><p>אין כאן מה לקנות כרגע. הוסיפו פריט כשמשהו מתחיל להיגמר.</p></div>}
          {recentlyBought.length > 0 && <section className="bought-section"><p className="section-kicker">נקנה עכשיו</p><div className="bought-list">{recentlyBought.map((item) => <div key={item.id} className="bought-entry"><span className="bought-pill">✓ {item.product.name}</span><button type="button" className="bought-undo" onClick={() => handleRestore(item)} disabled={restoreItem.isPending}>בטל</button></div>)}</div></section>}
        </>
      )}

      <button
        type="button"
        onClick={() => setIsAdding(true)}
        disabled={!activeShopId}
        className="add-button"
      >
        <span aria-hidden="true">＋</span><span>הוסף פריט</span>
      </button>

      {isAdding && activeShopId && (
        <AddItemSheet shopId={activeShopId} onClose={() => setIsAdding(false)} />
      )}
      </div>
    </main>
  );
}
