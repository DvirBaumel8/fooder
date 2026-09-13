import { useState } from "react";
import { useListQuery, useCompleteItem, useDeleteItem } from "./api/list";
import { useListEvents } from "./api/useListEvents";
import { ItemCard } from "./components/ItemCard";
import { AddItemSheet } from "./components/AddItemSheet";
import { ProfileSwitcher, useProfile } from "./components/ProfileSwitcher";

export default function App() {
  useListEvents();
  const [profile, setProfile] = useProfile();
  const { data: items, isLoading, isError, refetch } = useListQuery();
  const completeItem = useCompleteItem();
  const deleteItem = useDeleteItem();
  const [isAdding, setIsAdding] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 p-4 text-slate-900">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">היי, {profile}</h1>
        <ProfileSwitcher profile={profile} onChange={setProfile} />
      </div>

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
          {items?.map((item) => (
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
        className="fixed bottom-6 left-6 h-14 w-14 rounded-full bg-blue-600 text-2xl text-white shadow-lg"
      >
        +
      </button>

      {isAdding && <AddItemSheet onClose={() => setIsAdding(false)} />}
    </div>
  );
}
