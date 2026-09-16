import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import type { ShoppingListItem } from "../api/types";
import { renderWithClient } from "../test/render";
import { AddItemSheet } from "./AddItemSheet";

const mutationState = vi.hoisted(() => ({
  update: vi.fn(),
  add: vi.fn(),
  upload: vi.fn(),
}));

vi.mock("../api/list", () => ({
  useAddItem: () => ({
    isPending: false,
    mutateAsync: mutationState.add,
    mutate: (input: unknown, options?: { onSuccess?: (value: ShoppingListItem) => void; onError?: () => void }) =>
      mutationState.add(input).then(options?.onSuccess).catch(options?.onError),
  }),
  useUpdateItem: () => ({
    isPending: false,
    mutateAsync: mutationState.update,
    mutate: (input: unknown, options?: { onSuccess?: () => void; onError?: () => void }) =>
      mutationState.update(input).then(options?.onSuccess).catch(options?.onError),
  }),
}));

vi.mock("../api/products", () => ({
  useProductsQuery: () => ({ data: [] }),
  useUploadProductPhoto: () => ({
    isPending: false,
    mutateAsync: mutationState.upload,
    mutate: (input: unknown, options?: { onSuccess?: () => void; onError?: () => void }) =>
      mutationState.upload(input).then(options?.onSuccess).catch(options?.onError),
  }),
}));

const milkItem: ShoppingListItem = {
  id: "item-1",
  quantity: "2",
  note: "ללא לקטוז",
  createdAt: "2026-09-16T10:00:00.000Z",
  product: { id: "product-1", name: "חלב", category: "מוצרי חלב", photoUrl: null },
  shop: { id: "shop-1", name: "הסופר שלי" },
};

function mockUpdateItemError() {
  mutationState.update.mockRejectedValueOnce(new Error("Update failed"));
}

beforeEach(() => {
  mutationState.add.mockReset();
  mutationState.update.mockReset();
  mutationState.upload.mockReset();
  mutationState.add.mockResolvedValue(milkItem);
  mutationState.update.mockResolvedValue(milkItem);
  mutationState.upload.mockResolvedValue(milkItem.product);
});

it("shows product identity as read-only while allowing item details to be edited", () => {
  renderWithClient(<AddItemSheet shopId="shop-1" item={milkItem} onClose={vi.fn()} />);

  expect(screen.getByDisplayValue("חלב")).toHaveAttribute("readonly");
  expect(screen.getByDisplayValue("2")).not.toHaveAttribute("readonly");
});

it("keeps item fields visible after a save error", async () => {
  mockUpdateItemError();
  const user = userEvent.setup();
  renderWithClient(<AddItemSheet shopId="shop-1" item={milkItem} onClose={vi.fn()} />);

  await user.clear(screen.getByLabelText("כמות"));
  await user.type(screen.getByLabelText("כמות"), "3");
  await user.click(screen.getByRole("button", { name: "שמור שינויים" }));

  expect(await screen.findByText("לא הצלחנו לשמור את השינויים. נסו שוב.")).toBeVisible();
  expect(screen.getByLabelText("כמות")).toHaveValue("3");
});

it("retries only the photo upload after a create flow reaches a photo error", async () => {
  mutationState.add.mockResolvedValueOnce(milkItem).mockRejectedValueOnce(new Error("Duplicate item"));
  mutationState.upload.mockRejectedValue(new Error("Photo upload failed"));
  const user = userEvent.setup();
  renderWithClient(<AddItemSheet shopId="shop-1" onClose={vi.fn()} />);

  await user.type(screen.getByLabelText("מוצר"), "גבינה");
  await user.click(screen.getByRole("button", { name: "פרטים נוספים" }));
  await user.upload(screen.getByLabelText(/תמונה/), new File(["photo"], "cheese.jpg", { type: "image/jpeg" }));
  await user.click(screen.getByRole("button", { name: "הוסף פריט" }));

  expect(await screen.findByText("לא הצלחנו להעלות את התמונה. נסו שוב.")).toBeVisible();

  await user.click(screen.getByRole("button", { name: "נסה להעלות שוב" }));

  expect(await screen.findByText("לא הצלחנו להעלות את התמונה. נסו שוב.")).toBeVisible();
  expect(screen.queryByText("לא הצלחנו להוסיף את הפריט. נסו שוב.")).not.toBeInTheDocument();
});
