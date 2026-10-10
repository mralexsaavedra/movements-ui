import {
  persistQueryClientRestore,
  persistQueryClientSave,
} from "@tanstack/react-query-persist-client";
import { act, renderHook, waitFor } from "@testing-library/react-native";

import { createMovementsWrapper } from "@/features/movements/testing/createMovementsWrapper";
import { useMovementsInfiniteQuery } from "@/features/movements/ui/hooks/useMovementsInfiniteQuery";
import type { HttpClient } from "@/shared/http/HttpClient";
import { PERSISTED_CACHE_KEY } from "@/shared/query/cachePolicy";
import { createMemoryStorage } from "@/shared/testing/createMemoryStorage";
import { createTestQueryClient } from "@/shared/testing/createTestQueryClient";

import { createAppQueryPersistOptions } from "./queryPersistence";

/** A backend that never answers: whatever the hook shows comes from the restored cache. */
const silentHttpClient: HttpClient = { get: () => new Promise(() => undefined) };

/** First launch: load two pages and persist the cache. */
const persistTwoPages = async (storage: ReturnType<typeof createMemoryStorage>) => {
  const { Wrapper, queryClient } = createMovementsWrapper({ mock: { total: 60 } });
  const { result } = await renderHook(() => useMovementsInfiniteQuery(), { wrapper: Wrapper });
  await waitFor(() => expect(result.current.data?.items).toHaveLength(20));
  await act(async () => {
    await result.current.fetchNextPage();
  });
  await waitFor(() => expect(result.current.data?.items).toHaveLength(40));

  await persistQueryClientSave({ queryClient, ...createAppQueryPersistOptions(storage) });
  return result.current.data?.items ?? [];
};

describe("movements cache persistence", () => {
  it("restores the first page with real Date instances after a JSON round-trip", async () => {
    const storage = createMemoryStorage();
    const original = await persistTwoPages(storage);
    expect(storage.items.get(PERSISTED_CACHE_KEY)).toContain(original[0]?.date.toISOString());

    // Next launch: a new client hydrated from storage, with no network.
    const queryClient = createTestQueryClient();
    await persistQueryClientRestore({ queryClient, ...createAppQueryPersistOptions(storage) });
    const { Wrapper } = createMovementsWrapper({ queryClient, httpClient: silentHttpClient });
    const { result } = await renderHook(() => useMovementsInfiniteQuery(), { wrapper: Wrapper });

    const restored = result.current.data?.items ?? [];
    expect(restored).toHaveLength(20);
    expect(restored[0]?.date).toBeInstanceOf(Date);
    expect(restored.map((item) => item.date.getTime())).toEqual(
      original.slice(0, 20).map((item) => item.date.getTime()),
    );
    expect(result.current.hasNextPage).toBe(true);
  });

  it("discards a cache written for another contract version", async () => {
    const storage = createMemoryStorage();
    await persistTwoPages(storage);
    const raw = storage.items.get(PERSISTED_CACHE_KEY) ?? "";
    storage.items.set(
      PERSISTED_CACHE_KEY,
      JSON.stringify({ ...(JSON.parse(raw) as object), buster: "items-0.9.0/snapshot-0" }),
    );

    const queryClient = createTestQueryClient();
    await persistQueryClientRestore({ queryClient, ...createAppQueryPersistOptions(storage) });

    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
    expect(storage.items.has(PERSISTED_CACHE_KEY)).toBe(false);
  });

  it("drops a restored movements snapshot that fails validation", async () => {
    const storage = createMemoryStorage();
    await persistTwoPages(storage);
    const raw = storage.items.get(PERSISTED_CACHE_KEY) ?? "";
    // Corrupt the amount of the first stored movement.
    storage.items.set(PERSISTED_CACHE_KEY, raw.replace(/"value":-?[\d.]+/, '"value":"oops"'));
    expect(storage.items.get(PERSISTED_CACHE_KEY)).toContain('"value":"oops"');

    const queryClient = createTestQueryClient();
    await persistQueryClientRestore({ queryClient, ...createAppQueryPersistOptions(storage) });

    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
  });
});
