---
name: react-query-patterns
description: "Trigger: React Query, TanStack Query, useInfiniteQuery, queryKeys, cache, staleTime, stale-while-revalidate, controller hook, QueryClient test wrapper. Data-layer patterns for movements-ui."
license: MIT
metadata:
  author: alexander-saavedra
  version: "1.0"
---

## Activation Contract

Load before writing hooks under `ui/hooks/`, configuring the QueryClient, or testing hooks.

## Query Keys Factory

```ts
// features/movements/ui/hooks/queryKeys.ts
export const movementKeys = {
  all: ['movements'] as const,
  lists: () => [...movementKeys.all, 'list'] as const,
  list: (params: { readonly limit: number }) => [...movementKeys.lists(), params] as const,
} as const;
```

Never inline key arrays elsewhere.

## Cache Constants

```ts
// shared/query/cacheTimes.ts
export const MOVEMENTS_STALE_TIME_MS = 30_000;       // fresh window: no refetch
export const MOVEMENTS_GC_TIME_MS = 10 * 60_000;     // keep cached pages for instant re-entry
export const DEFAULT_PAGE_SIZE = 20;                 // contract default
```

SWR behavior: cached pages render immediately; once stale, React Query refetches in the background
and swaps data without a spinner. Show the skeleton only when `isPending` (no cache at all).

## Infinite Query Hook

```ts
// ui/hooks/useMovementsInfiniteQuery.ts
export const useMovementsInfiniteQuery = (limit = DEFAULT_PAGE_SIZE) => {
  const repository = useMovementRepository();
  return useInfiniteQuery({
    queryKey: movementKeys.list({ limit }),
    queryFn: ({ pageParam }) =>
      repository.list(pageParam ? { cursor: pageParam, limit } : { limit }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    staleTime: MOVEMENTS_STALE_TIME_MS,
    gcTime: MOVEMENTS_GC_TIME_MS,
  });
};
```

The conditional object avoids passing `cursor: undefined` under `exactOptionalPropertyTypes`.

## Controller Hook

Adapts query state to what the view needs; keeps views dumb and testable.

```ts
// ui/hooks/useMovementListController.ts
export const useMovementListController = () => {
  const query = useMovementsInfiniteQuery();
  const movements = useMemo(() => query.data?.pages.flatMap((p) => p.items) ?? [], [query.data]);

  const loadMore = useCallback(() => {
    if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
  }, [query.hasNextPage, query.isFetchingNextPage, query.fetchNextPage]);

  return {
    movements,
    isInitialLoading: query.isPending,
    isError: query.isError && movements.length === 0,
    isRefreshing: query.isRefetching && !query.isFetchingNextPage,
    isLoadingMore: query.isFetchingNextPage,
    loadMore,
    refresh: query.refetch,
  } as const;
};
```

## Test Wrapper

```tsx
// shared/testing/createQueryWrapper.tsx
export const createQueryWrapper = (repository: MovementRepository) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  const Wrapper = ({ children }: { readonly children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <MovementRepositoryProvider value={repository}>{children}</MovementRepositoryProvider>
    </QueryClientProvider>
  );
  return { client, Wrapper };
};
```

```ts
const { Wrapper } = createQueryWrapper(createMockMovementRepository({ latencyMs: 0, total: 45 }));
const { result } = renderHook(() => useMovementListController(), { wrapper: Wrapper });
await waitFor(() => expect(result.current.movements).toHaveLength(20));
act(() => result.current.loadMore());
await waitFor(() => expect(result.current.movements).toHaveLength(40));
```

## Rules

- One hook per file. No `useQuery` inside presentational components.
- `retry: false` in tests; real client keeps a small retry with backoff.
- Errors bubble as domain errors (`InvalidPayloadError`, `NetworkError`) so the UI can branch.
