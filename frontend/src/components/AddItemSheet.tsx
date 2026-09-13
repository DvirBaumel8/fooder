import { useState } from "react";
import { useProductsQuery, useUploadProductPhoto } from "../api/products";
import { useAddItem } from "../api/list";

interface AddItemSheetProps {
  shopId: string;
  onClose: () => void;
}

export function AddItemSheet({ shopId, onClose }: AddItemSheetProps) {
  const [search, setSearch] = useState("");
  const [quantity, setQuantity] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const { data: products } = useProductsQuery(search);
  const addItem = useAddItem();
  const uploadPhoto = useUploadProductPhoto();
  const isBusy = addItem.isPending || uploadPhoto.isPending;
  const hasError = addItem.isError || uploadPhoto.isError;

  const attachPhotoIfAny = (productId: string) => {
    if (file) {
      uploadPhoto.mutate({ productId, file });
    }
  };

  const handleAddExisting = (productId: string) => {
    addItem.mutate(
      { productId, quantity: quantity || undefined, shopId },
      {
        onSuccess: () => {
          attachPhotoIfAny(productId);
          onClose();
        },
      }
    );
  };

  const handleCreateNew = () => {
    if (!search.trim()) return;
    addItem.mutate(
      { name: search.trim(), quantity: quantity || undefined, shopId },
      {
        onSuccess: (item) => {
          attachPhotoIfAny(item.product.id);
          onClose();
        },
      }
    );
  };

  return (
    <div className="fixed inset-0 flex items-end bg-black/40">
      <div className="w-full rounded-t-xl bg-white p-4">
        <input
          autoFocus
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="מה צריך לקנות?"
          className="mb-2 w-full rounded-md border border-slate-300 p-2"
        />
        <input
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder="כמות (לא חובה)"
          className="mb-2 w-full rounded-md border border-slate-300 p-2"
        />
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="mb-3 w-full text-sm"
        />

        <ul className="mb-3 max-h-48 overflow-y-auto">
          {products?.map((product) => (
            <li key={product.id}>
              <button
                type="button"
                onClick={() => handleAddExisting(product.id)}
                disabled={isBusy}
                className="w-full rounded-md p-2 text-right hover:bg-slate-100 disabled:opacity-50"
              >
                {product.name}
              </button>
            </li>
          ))}
        </ul>

        {hasError && (
          <p className="mb-2 text-sm text-red-600">משהו השתבש, נסה שוב</p>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleCreateNew}
            disabled={!search.trim() || isBusy}
            className="flex-1 rounded-md bg-blue-600 p-2 text-white disabled:opacity-50"
          >
            הוסף &quot;{search}&quot; כפריט חדש
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 p-2"
          >
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
}
