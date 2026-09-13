import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./client";
import type { Shop } from "./types";

export const SHOPS_QUERY_KEY = ["shops"] as const;

export function useShopsQuery() {
  return useQuery({
    queryKey: SHOPS_QUERY_KEY,
    queryFn: () => apiFetch<Shop[]>("/api/shops"),
  });
}

export function useAddShop() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      apiFetch<Shop>("/api/shops", {
        method: "POST",
        body: JSON.stringify({ name }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SHOPS_QUERY_KEY });
    },
  });
}
