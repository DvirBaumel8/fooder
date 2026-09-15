import { useRef, useState } from "react";
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submissionLock = useRef(false);
  const { data: products } = useProductsQuery(search);
  const addItem = useAddItem();
  const uploadPhoto = useUploadProductPhoto();
  const isBusy = isSubmitting || addItem.isPending || uploadPhoto.isPending;
  const hasError = addItem.isError || uploadPhoto.isError;

  const attachPhotoIfAny = (productId: string) => {
    if (file) {
      uploadPhoto.mutate({ productId, file });
    }
  };

  const handleAddExisting = (productId: string) => {
    if (submissionLock.current) return;
    submissionLock.current = true;
    setIsSubmitting(true);
    addItem.mutate(
      { productId, quantity: quantity || undefined, shopId },
      {
        onSuccess: () => {
          attachPhotoIfAny(productId);
          onClose();
        },
        onError: () => {
          submissionLock.current = false;
          setIsSubmitting(false);
        },
      }
    );
  };

  const handleCreateNew = () => {
    if (!search.trim() || submissionLock.current) return;
    submissionLock.current = true;
    setIsSubmitting(true);
    addItem.mutate(
      { name: search.trim(), quantity: quantity || undefined, shopId },
      {
        onSuccess: (item) => {
          attachPhotoIfAny(item.product.id);
          onClose();
        },
        onError: () => {
          submissionLock.current = false;
          setIsSubmitting(false);
        },
      }
    );
  };

  return (
    <div className="sheet-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="add-sheet" role="dialog" aria-modal="true" aria-labelledby="add-item-title">
        <div className="sheet-handle" aria-hidden="true" />
        <div className="sheet-header">
          <div><p className="section-kicker">רשימת קניות</p><h2 id="add-item-title">מה חסר בבית?</h2></div>
          <button type="button" onClick={onClose} className="close-button" aria-label="סגור">×</button>
        </div>
        <input
          autoFocus
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="מה צריך לקנות?"
          className="field field-search"
        />
        <div className="detail-row">
          <input value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="כמות (לא חובה)" className="field" />
          <label className="photo-button"><span aria-hidden="true">📷</span> תמונה<input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></label>
        </div>
        {file && <p className="file-note">התמונה מצורפת: {file.name}</p>}

        <ul className="suggestion-list">
          {products?.map((product) => (
            <li key={product.id}>
              <button
                type="button"
                onClick={() => handleAddExisting(product.id)}
                disabled={isBusy}
                className="suggestion-button"
              >
                <span className="suggestion-icon">＋</span>{product.name}
              </button>
            </li>
          ))}
        </ul>

        {hasError && (
          <p className="form-error">משהו השתבש, נסה שוב</p>
        )}

        <div className="sheet-actions">
          <button
            type="button"
            onClick={handleCreateNew}
            disabled={!search.trim() || isBusy}
            className="button button-primary add-new-button"
          >
            {isBusy ? "מוסיף..." : <>הוסף &quot;{search}&quot; כפריט חדש</>}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="button button-quiet"
          >
            ביטול
          </button>
        </div>
      </section>
    </div>
  );
}
