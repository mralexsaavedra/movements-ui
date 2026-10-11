---
name: react-query-patterns
description: "Trigger: React Query, TanStack Query, useInfiniteQuery, queryKeys, cache, staleTime, stale-while-revalidate, controller hook, QueryClient test wrapper. Data-layer patterns for movements-ui."
license: MIT
metadata:
  author: alexander-saavedra
  version: "1.0"
---

## Activation Contract

Load before writing hooks under `ui/hooks/`, touching `ui/cache/`, configuring the QueryClient or
its persistence, or testing hooks.

## Where Things Live

| Concern                                          | File                                                 |
| ------------------------------------------------ | ---------------------------------------------------- |
| Cache constants (stale/gc/retries/persist)       | `shared/query/cachePolicy.ts` (one file, documented) |
| Retry predicate                                  | `shared/query/shouldRetry.ts`                        |
| App `QueryClient`                                | `shared/query/createQueryClient.ts`                  |
| Persistence (AsyncStorage, buster, page cap)     | `shared/query/createQueryPersistOptions.ts`          |
| AppState focus + expo-network online             | `shared/query/configureQueryManagers.ts`             |
| Movements keys / cache snapshot / `select`       | `features/movements/ui/cache/`                       |
| What gets persisted for the app                  | `composition/queryPersistence.ts`                    |
| Providers wiring (persisted client, repo, theme) | `composition/AppProviders.tsx`                       |

## Query Keys Factory

```ts
// features/movements/ui/cache/movementsKeys.ts
export const movementsKeys = {
  all: ["movements"] as const,
  lists: () => [...movementsKeys.all, "list"] as const,
  list: (params: { readonly limit: number }) => [...movementsKeys.lists(), params] as const,
} as const;
```

Never inline key arrays elsewhere.

## Cache Policy

- `STALE_TIME_MS` 30 s; `GC_TIME_MS` = `PERSIST_MAX_AGE_MS` = 24 h (gc must be >= maxAge or
  persisted queries are dropped early).
- `retry: shouldRetry`: only `HttpError` with status 0 (network) or 5xx, at most 2 retries, default
  exponential backoff. 4xx, `ContractError` and unknown errors fail immediately.
- Focus/online: `configureQueryManagers()` (AppState → `focusManager`, expo-network →
  `onlineManager`), called once during `AppProviders`' first render (a `useState` initializer), before any child subscribes to a query.

SWR: cached (or restored) pages render immediately; once stale, React Query refetches in the
background. Show the skeleton only for `status: "loading"` (no data at all).

## Persistence and the Date Trap

The cache is persisted to AsyncStorage as JSON (`maxAge` 24 h, `buster` = `MOVEMENTS_CACHE_VERSION`,
only successful movements queries, only the first `MAX_PERSISTED_PAGES` page). JSON would turn
`Movement.date` into a string on restore, so the query caches a JSON-safe **snapshot**
(`toPageSnapshot`, ISO dates) and `selectMovementList` revives `Date`s. Bump
`MOVEMENTS_CACHE_VERSION` whenever the contract or the snapshot shape changes. Restored snapshots
are Zod-validated before hydration (invalid → dropped), and the stored string is encrypted with
AES-256-GCM (`src/shared/storage/`, key in SecureStore); an undecryptable value is treated as no cache.

## Infinite Query Hook

```ts
// ui/hooks/useMovementsInfiniteQuery.ts
return useInfiniteQuery({
  queryKey: movementsKeys.list({ limit }),
  queryFn: async ({ pageParam, signal }) =>
    toPageSnapshot(
      await repository.getMovements({
        limit,
        signal,
        ...(typeof pageParam === "string" ? { cursor: pageParam } : {}), // restored param is null
      }),
    ),
  initialPageParam: undefined as string | undefined,
  getNextPageParam: (last) => last.nextCursor ?? undefined,
  select: selectMovementList, // module-level: dedupes ids across pages, sums invalidCount
});
```

No `maxPages`: the contract has no previous cursor to refetch dropped pages.

## Controller Hook

`useMovementList()` returns `{ status: "loading" | "error" | "empty" | "success", items,
invalidCount, isRefreshing, isFetchingNextPage, hasNextPage, error, loadMore, refresh, retry }`.

- `error`/`empty` describe the first load only; a later failure keeps `success` and sets `error`.
- `loadMore` is a no-op while fetching, at the end, or after a failed page (`retry` re-fetches it).
- `refresh` fetches page 1 itself and replaces the cached pages only on success; a failed refresh keeps every loaded row and exposes the error. Offline, it returns immediately and `isOffline` drives a banner.

## Test Wrapper

```tsx
const { Wrapper } = createMovementsWrapper({ mock: { total: 45 } }); // features/movements/testing
const { result } = await renderHook(() => useMovementList(), { wrapper: Wrapper });
await waitFor(() => expect(result.current.items).toHaveLength(20));
await act(async () => result.current.loadMore());
await waitFor(() => expect(result.current.items).toHaveLength(40));
```

- Real repository + mock transport (`latencyMs: 0`) + `createTestQueryClient()` (`retry: false`,
  `gcTime: Infinity` so no gc timers keep Jest alive).
- `createControllableHttpClient` switches failures on/off and holds requests to observe in-flight
  states.
- Tracked props: React Query re-renders only for result fields that were read. When testing the raw
  query hook, read `data` in the first `waitFor`, or later updates never reach `result.current`.

## Rules

- One hook per file. No `useQuery` inside presentational components.
- Errors surface as `HttpError` (transport) or `ContractError` (payload) so the UI can branch.
