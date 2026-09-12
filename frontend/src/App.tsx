import { useListQuery, useCompleteItem, useDeleteItem } from "./api/list";
import { ItemCard } from "./components/ItemCard";

export default function App() {
  const { data: items, isLoading } = useListQuery();
  const completeItem = useCompleteItem();
  const deleteItem = useDeleteItem();

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
    </div>
  );
}
