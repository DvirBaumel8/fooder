export interface Product {
  id: string;
  name: string;
  category: string | null;
  photoUrl: string | null;
  timesAdded: number;
  lastAddedAt: string | null;
  createdAt: string;
}

export interface Shop {
  id: string;
  name: string;
  createdAt: string;
}

export interface ShoppingListItem {
  id: string;
  quantity: string | null;
  note: string | null;
  createdAt: string;
  product: Pick<Product, "id" | "name" | "category" | "photoUrl">;
  shop: Pick<Shop, "id" | "name">;
}
