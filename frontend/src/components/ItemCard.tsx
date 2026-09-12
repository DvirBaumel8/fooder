import type { ShoppingListItem } from "../api/types";

interface ItemCardProps {
  item: ShoppingListItem;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
}

export function ItemCard({ item, onComplete, onDelete }: ItemCardProps) {
  return (
    <li className="flex items-center gap-3 rounded-lg bg-white p-3 shadow-sm">
      {item.product.photoUrl ? (
        <img
          src={item.product.photoUrl}
          alt={item.product.name}
          className="h-12 w-12 rounded-md object-cover"
        />
      ) : (
        <div className="h-12 w-12 rounded-md bg-slate-200" />
      )}

      <div className="flex-1">
        <p className="font-medium">{item.product.name}</p>
        <p className="text-sm text-slate-500">
          {[item.quantity, item.product.category].filter(Boolean).join(" · ")}
        </p>
      </div>

      <button
        type="button"
        onClick={() => onComplete(item.id)}
        className="rounded-full border border-green-600 px-3 py-1 text-sm text-green-700"
      >
        נקנה
      </button>
      <button
        type="button"
        onClick={() => onDelete(item.id)}
        className="rounded-full border border-red-600 px-3 py-1 text-sm text-red-700"
      >
        מחק
      </button>
    </li>
  );
}
