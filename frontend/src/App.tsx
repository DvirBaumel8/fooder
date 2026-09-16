import { useEffect, useMemo, useState } from "react";
import { useListQuery, useCompleteItem, useDeleteItem, useAddItem } from "./api/list";
import { useShopsQuery } from "./api/shops";
import { useListEvents } from "./api/useListEvents";
import { AddItemSheet } from "./components/AddItemSheet";
import { ShopTabs } from "./components/ShopTabs";
import { ProfileSwitcher, useProfile } from "./components/ProfileSwitcher";
import { ListToolbar } from "./components/ListToolbar";
import { ShoppingList } from "./components/ShoppingList";
import { CompletedItems } from "./components/CompletedItems";
import { Toast } from "./components/Toast";
import type { ListSort } from "./lib/listPresentation";
import type { ShoppingListItem } from "./api/types";

interface ToastState {
  message: string;
  actionLabel?: string;
  item?: ShoppingListItem;
}

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
  const [editingItem, setEditingItem] = useState<ShoppingListItem | null>(null);
  const [activeShopId, setActiveShopId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<ListSort>("newest");
  const [completedHistory, setCompletedHistory] = useState<ShoppingListItem[]>([]);
  const [toast, setToast] = useState<ToastState | null>(null);
  const restoreItem = useAddItem();

  useEffect(() => {
    if (!activeShopId && shops && shops.length > 0) {
      setActiveShopId(shops[0].id);
    }
  }, [shops, activeShopId]);

  const activeItems = useMemo(
    () => items?.filter((item) => item.shop.id === activeShopId) ?? [],
    [items, activeShopId]
  );
  const activeShop = shops?.find((shop) => shop.id === activeShopId);

  const handleComplete = (id: string) => {
    const item = activeItems.find((entry) => entry.id === id);
    if (!item) return;
    completeItem.mutate(id, {
      onSuccess: () => {
        setCompletedHistory((current) => [item, ...current].slice(0, 3));
        setToast({ message: "סומן כנקנה", actionLabel: "בטל", item });
      },
    });
  };

  const handleDelete = (id: string) => {
    deleteItem.mutate(id, {
      onSuccess: () => setToast({ message: "הפריט נמחק" }),
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
        onSuccess: () => {
          setCompletedHistory((current) => current.filter((entry) => entry.id !== item.id));
          setToast((current) => (current?.item?.id === item.id ? null : current));
        },
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
            <div className="count-badge"><strong>{activeItems.length}</strong><span>{activeItems.length === 1 ? "פריט" : "פריטים"}</span></div>
          </section>
          <ListToolbar
            shopName={activeShop?.name ?? "החנות"}
            value={query}
            onSearchChange={setQuery}
            sort={sort}
            onSortChange={setSort}
          />
          <ShoppingList
            items={activeItems}
            query={query}
            sort={sort}
            onComplete={handleComplete}
            onEdit={setEditingItem}
            onDelete={handleDelete}
          />
          <CompletedItems items={completedHistory} onRestore={handleRestore} isRestoring={restoreItem.isPending} />
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

      {toast && (
        <Toast
          message={toast.message}
          actionLabel={toast.actionLabel}
          onAction={toast.item ? () => handleRestore(toast.item as ShoppingListItem) : undefined}
          onDismiss={() => setToast(null)}
        />
      )}

      {isAdding && activeShopId && (
        <AddItemSheet shopId={activeShopId} onClose={() => setIsAdding(false)} />
      )}
      {editingItem && (
        <AddItemSheet shopId={editingItem.shop.id} item={editingItem} onClose={() => setEditingItem(null)} />
      )}
      </div>
    </main>
  );
}
