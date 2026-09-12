import { useState } from "react";
import { useListQuery, useCompleteItem, useDeleteItem } from "./api/list";
import { useListEvents } from "./api/useListEvents";
import { ItemCard } from "./components/ItemCard";
import { AddItemSheet } from "./components/AddItemSheet";

export default function App() {
  useListEvents();
  const { data: items, isLoading } = useListQuery();
  const completeItem = useCompleteItem();
  const deleteItem = useDeleteItem();
  const [isAdding, setIsAdding] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 p-4 text-slate-900">
      <h1 className="mb-4 text-2xl font-bold">רשימת קניות</h1>

      {isLoading && <p>טוען...</p>}

      <ul className="flex flex-col gap-2">
        {items?.map((item) => (
          <ItemCard
            key={item.id}
            item={item}
            onComplete={(id) => completeItem.mutate(id)}
            onDelete={(id) => deleteItem.mutate(id)}
          />
        ))}
      </ul>

      <button
        type="button"
        onClick={() => setIsAdding(true)}
        className="fixed bottom-6 left-6 h-14 w-14 rounded-full bg-blue-600 text-2xl text-white shadow-lg"
      >
        +
      </button>

      {isAdding && <AddItemSheet onClose={() => setIsAdding(false)} />}
    </div>
  );
}
