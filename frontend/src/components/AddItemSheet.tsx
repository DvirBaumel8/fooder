import { useCallback, useEffect, useRef, useState } from "react";
import { useProductsQuery, useUploadProductPhoto } from "../api/products";
import { useAddItem, useUpdateItem } from "../api/list";
import type { ShoppingListItem } from "../api/types";

interface AddItemSheetProps {
  shopId: string;
  onClose: () => void;
  item?: ShoppingListItem;
}

export function AddItemSheet({ shopId, onClose, item }: AddItemSheetProps) {
  const isEditing = Boolean(item);
  const [search, setSearch] = useState(item?.product.name ?? "");
  const [quantity, setQuantity] = useState(item?.quantity ?? "");
  const [note, setNote] = useState(item?.note ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [showDetails, setShowDetails] = useState(Boolean(item?.quantity || item?.note || item?.product.photoUrl));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingPhotoProductId, setPendingPhotoProductId] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const normalizedSearch = search.trim();
  const productSearch = !isEditing && normalizedSearch.length >= 2 ? normalizedSearch : "";
  const { data: products } = useProductsQuery(productSearch);
  const addItem = useAddItem();
  const updateItem = useUpdateItem();
  const uploadPhoto = useUploadProductPhoto();
  const isBusy = isSubmitting || addItem.isPending || updateItem.isPending || uploadPhoto.isPending;

  const closeSheet = useCallback(() => {
    if (isBusy) return;
    onClose();
    window.setTimeout(() => returnFocusRef.current?.focus(), 0);
  }, [isBusy, onClose]);

  useEffect(() => {
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    (isEditing ? headingRef.current : nameInputRef.current)?.focus();
  }, [isEditing]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      closeSheet();
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [closeSheet]);

  const uploadSelectedPhoto = async (productId: string) => {
    if (file) {
      await uploadPhoto.mutateAsync({ productId, file });
    }
  };

  const retryPhotoUpload = async (): Promise<"not-needed" | "uploaded" | "failed"> => {
    if (!pendingPhotoProductId || !file) return "not-needed";

    try {
      await uploadSelectedPhoto(pendingPhotoProductId);
      setPendingPhotoProductId(null);
      closeSheet();
      return "uploaded";
    } catch {
      setFormError("לא הצלחנו להעלות את התמונה. נסו שוב.");
      return "failed";
    }
  };

  const handleUpdate = async () => {
    if (!item || isBusy) return;
    setIsSubmitting(true);
    setFormError(null);

    try {
      if ((await retryPhotoUpload()) !== "not-needed") return;

      await updateItem.mutateAsync({ id: item.id, quantity: quantity || undefined, note: note || undefined });
      try {
        await uploadSelectedPhoto(item.product.id);
      } catch {
        setPendingPhotoProductId(item.product.id);
        setFormError("לא הצלחנו להעלות את התמונה. נסו שוב.");
        return;
      }
      closeSheet();
    } catch {
      setFormError("לא הצלחנו לשמור את השינויים. נסו שוב.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdd = async (input: { productId?: string; name?: string }) => {
    if (isBusy) return;
    setIsSubmitting(true);
    setFormError(null);

    try {
      if ((await retryPhotoUpload()) !== "not-needed") return;

      const addedItem = await addItem.mutateAsync({
        ...input,
        quantity: quantity || undefined,
        note: note || undefined,
        shopId,
      });
      try {
        await uploadSelectedPhoto(addedItem.product.id);
      } catch {
        setPendingPhotoProductId(addedItem.product.id);
        setFormError("לא הצלחנו להעלות את התמונה. נסו שוב.");
        return;
      }
      closeSheet();
    } catch {
      setFormError("לא הצלחנו להוסיף את הפריט. נסו שוב.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateNew = () => {
    if (!normalizedSearch) return;
    void handleAdd({ name: normalizedSearch });
  };

  return (
    <div
      className="sheet-backdrop"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && closeSheet()}
    >
      <section
        className="add-sheet ledger-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-item-title"
      >
        <div className="sheet-handle" aria-hidden="true" />
        <div className="sheet-header">
          <div>
            <p className="section-kicker">רשימת קניות</p>
            <h2 id="add-item-title" ref={headingRef} tabIndex={-1}>{isEditing ? "עריכת פריט" : "הוספת פריט"}</h2>
          </div>
          <button type="button" onClick={closeSheet} className="close-button" aria-label="סגור" disabled={isBusy}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
          </button>
        </div>

        <div className="sheet-form-content">
          <div className="field-group">
            <label htmlFor="item-name">מוצר</label>
            <input
              id="item-name"
              ref={nameInputRef}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="מה צריך לקנות?"
              className="field field-search"
              readOnly={isEditing}
            />
            {isEditing && <p className="field-help">שם המוצר נשמר כדי לא לשנות פריטים אחרים.</p>}
          </div>

          {!isEditing && productSearch && products && products.length > 0 && (
            <div className="suggestions" aria-label="מוצרים קיימים">
              <p className="suggestion-heading">כבר קיים אצלך</p>
              <ul className="suggestion-list">
                {products.map((product) => (
                  <li key={product.id}>
                    <button
                      type="button"
                      onClick={() => void handleAdd({ productId: product.id })}
                      disabled={isBusy}
                      className="suggestion-button"
                    >
                      <span>{product.name}</span>
                      <span className="suggestion-action">הוסף</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button
            type="button"
            className="details-disclosure"
            aria-expanded={showDetails}
            aria-controls="item-details"
            onClick={() => setShowDetails((current) => !current)}
          >
            <span>פרטים נוספים</span>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
          </button>

          {showDetails && (
            <div id="item-details" className="item-details">
              <div className="field-group">
                <label htmlFor="item-quantity">כמות</label>
                <input
                  id="item-quantity"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  placeholder="לדוגמה: 2 יחידות"
                  className="field"
                />
              </div>
              <div className="field-group">
                <label htmlFor="item-note">הערה</label>
                <input
                  id="item-note"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="לדוגמה: ללא לקטוז"
                  className="field"
                />
              </div>
              <div className="field-group">
                <label htmlFor="item-photo" className="photo-button">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h3l1.5-2h7L17 7h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1Zm8 3.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" /></svg>
                  <span>תמונה</span>
                  <span className="photo-button-copy">{file || item?.product.photoUrl ? "החלפת תמונה" : "בחירת תמונה"}</span>
                </label>
                <input
                  id="item-photo"
                  className="visually-hidden"
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    const selectedFile = event.target.files?.[0] ?? null;
                    setFile(selectedFile);
                    if (selectedFile) setShowDetails(true);
                  }}
                />
                {file && <p className="file-note">התמונה נבחרה: {file.name}</p>}
              </div>
            </div>
          )}

          {formError && <p className="form-error" role="alert">{formError}</p>}
        </div>

        <div className="sheet-actions">
          <button type="button" onClick={isEditing ? () => void handleUpdate() : handleCreateNew} disabled={(!isEditing && !normalizedSearch) || isBusy} className="button button-primary add-new-button sheet-save-action">
            {isBusy ? (isEditing ? "שומר..." : "מוסיף...") : isEditing ? "שמור שינויים" : pendingPhotoProductId ? "נסה להעלות שוב" : "הוסף פריט"}
          </button>
          <button type="button" onClick={closeSheet} disabled={isBusy} className="button button-quiet">ביטול</button>
        </div>
      </section>
    </div>
  );
}
