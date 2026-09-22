import { useEffect, useMemo, useRef, useState } from "react";
import { useListQuery, useCompleteItem, useDeleteItem, useAddItem } from "./api/list";
import { useShopsQuery } from "./api/shops";
import { useListEvents } from "./api/useListEvents";
import { AddItemSheet } from "./components/AddItemSheet";
import { ShopSelector } from "./components/ShopSelector";
import { ProfileSwitcher, useProfile } from "./components/ProfileSwitcher";
import { ListToolbar } from "./components/ListToolbar";
import { ShoppingList } from "./components/ShoppingList";
import { CompletedItems } from "./components/CompletedItems";
import { Toast } from "./components/Toast";
import { filterAndSortItems, type ListSort } from "./lib/listPresentation";
import type { ShoppingListItem } from "./api/types";

interface ToastState {
  id: number;
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
  const toastIdRef = useRef(0);
  const listHeadingRef = useRef<HTMLHeadingElement>(null);

  const showToast = (state: Omit<ToastState, "id">) => {
    toastIdRef.current += 1;
    setToast({ id: toastIdRef.current, ...state });
  };

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
  const visibleItems = useMemo(
    () => filterAndSortItems(activeItems, query, sort),
    [activeItems, query, sort]
  );

  const handleComplete = (id: string) => {
    const item = activeItems.find((entry) => entry.id === id);
    if (!item) return;
    completeItem.mutate(id, {
      onSuccess: () => {
        setCompletedHistory((current) => [item, ...current].slice(0, 3));
        showToast({ message: "סומן כנקנה", actionLabel: "בטל", item });
      },
      onError: () => {
        showToast({ message: "לא הצלחנו לסמן את הפריט כנקנה. נסו שוב." });
      },
    });
  };

  const handleDelete = (id: string) => {
    return new Promise<void>((resolve, reject) => {
      deleteItem.mutate(id, {
        onSuccess: () => {
          showToast({ message: "הפריט נמחק" });
          // The row (and its focused delete control) is about to unmount once the
          // refetch resolves; move focus to a stable landmark instead of letting it
          // fall back to <body>.
          listHeadingRef.current?.focus();
          resolve();
        },
        onError: () => {
          showToast({ message: "לא הצלחנו למחוק את הפריט. נסו שוב." });
          reject(new Error("delete-failed"));
        },
      });
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
        onError: () => {
          showToast({ message: "לא הצלחנו לשחזר את הפריט. נסו שוב." });
        },
      }
    );
  };

  const toastItem = toast?.item;

  return (
    <main className="app-shell">
      <div className="app-container">
        <header className="app-header">
          <div className="app-brand">
            <p className="app-brand-label">פודים</p>
            <p className="app-brand-profile">שלום, {profile}</p>
          </div>
          <ProfileSwitcher profile={profile} onChange={setProfile} />
        </header>

        <ShopSelector activeShopId={activeShopId} onSelect={setActiveShopId} />

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
          <ListToolbar
            shopName={activeShop?.name ?? "החנות"}
            value={query}
            onSearchChange={setQuery}
            sort={sort}
            onSortChange={setSort}
          />
          <section className="list-summary">
            <h2 ref={listHeadingRef} tabIndex={-1}>
              לקנות · {visibleItems.length} {visibleItems.length === 1 ? "פריט" : "פריטים"}
            </h2>
          </section>
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
        aria-label="הוספת פריט"
      >
        <span aria-hidden="true">＋</span>
      </button>

      {toast && (
        <Toast
          key={toast.id}
          message={toast.message}
          actionLabel={toast.actionLabel}
          onAction={toastItem ? () => handleRestore(toastItem) : undefined}
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
