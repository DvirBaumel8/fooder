import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./client";
import type { ShoppingListItem } from "./types";

export const LIST_QUERY_KEY = ["list"] as const;

export function useListQuery() {
  return useQuery({
    queryKey: LIST_QUERY_KEY,
    queryFn: () => apiFetch<ShoppingListItem[]>("/api/list"),
  });
}

export interface AddItemInput {
  productId?: string;
  name?: string;
  category?: string;
  quantity?: string;
  note?: string;
  shopId: string;
}

export function useAddItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AddItemInput) =>
      apiFetch<ShoppingListItem>("/api/list", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LIST_QUERY_KEY });
    },
  });
}

export function useCompleteItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/api/list/${id}/complete`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LIST_QUERY_KEY });
    },
  });
}

export function useDeleteItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/api/list/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LIST_QUERY_KEY });
    },
  });
}
