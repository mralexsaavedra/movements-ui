import { QueryClient } from "@tanstack/react-query";

import { GC_TIME_MS, STALE_TIME_MS } from "./cachePolicy";
import { shouldRetry } from "./shouldRetry";

/**
 * App-wide `QueryClient` with the cache policy applied. Retries use React Query's default
 * exponential backoff (1 s, 2 s… capped at 30 s). Tests build their own client with `retry: false`.
 */
export const createQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: STALE_TIME_MS,
        gcTime: GC_TIME_MS,
        retry: shouldRetry,
      },
    },
  });
