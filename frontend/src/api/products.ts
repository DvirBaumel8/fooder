import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, API_BASE_URL } from "./client";
import { LIST_QUERY_KEY } from "./list";
import type { Product } from "./types";

export function useProductsQuery(search: string) {
  return useQuery({
    queryKey: ["products", search] as const,
    queryFn: () => apiFetch<Product[]>(`/api/products?q=${encodeURIComponent(search)}`),
    enabled: search.trim().length > 0,
    staleTime: 30_000,
  });
}

export function useUploadProductPhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ productId, file }: { productId: string; file: File }) => {
      const formData = new FormData();
      formData.append("photo", file);
      const res = await fetch(`${API_BASE_URL}/api/products/${productId}/photo`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        if (res.status === 413) {
          const body = await res.json().catch(() => null) as { error?: string } | null;
          if (body?.error === "photo is too large") throw new Error(body.error);
        }
        throw new Error(`Photo upload failed with status ${res.status}`);
      }
      return (await res.json()) as Product;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LIST_QUERY_KEY });
    },
  });
}
