import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { API_BASE_URL } from "./client";
import { LIST_QUERY_KEY } from "./list";
import { SHOPS_QUERY_KEY } from "./shops";

export function useListEvents() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const source = new EventSource(`${API_BASE_URL}/api/events`);

    source.addEventListener("list-changed", () => {
      queryClient.invalidateQueries({ queryKey: LIST_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: SHOPS_QUERY_KEY });
    });

    return () => {
      source.close();
    };
  }, [queryClient]);
}
