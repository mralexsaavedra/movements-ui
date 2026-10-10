import {
  persistQueryClientRestore,
  persistQueryClientSave,
} from "@tanstack/react-query-persist-client";
import { act, renderHook, waitFor } from "@testing-library/react-native";

import { createMovementsWrapper } from "@/features/movements/testing/createMovementsWrapper";
import { useMovementsInfiniteQuery } from "@/features/movements/ui/hooks/useMovementsInfiniteQuery";
import type { HttpClient } from "@/shared/http/HttpClient";
import { PERSISTED_CACHE_KEY } from "@/shared/query/cachePolicy";
import { createAesGcmCipher } from "@/shared/storage/createAesGcmCipher";
import { createEncryptedStorage } from "@/shared/storage/createEncryptedStorage";
import { createMemoryStorage } from "@/shared/testing/createMemoryStorage";
import { createMemoryKeyProvider, testRandomBytes } from "@/shared/testing/createTestEncryption";
import { createTestQueryClient } from "@/shared/testing/createTestQueryClient";

import { createAppQueryPersistOptions } from "./queryPersistence";

/** A backend that never answers: whatever the hook shows comes from the restored cache. */
const silentHttpClient: HttpClient = { get: () => new Promise(() => undefined) };

/** Raw storage plus the key that survives "launches", like the SecureStore entry does. */
const createDevice = () => ({
  storage: createMemoryStorage(),
  keyProvider: createMemoryKeyProvider(),
});
type Device = ReturnType<typeof createDevice>;

const persistOptions = ({ storage, keyProvider }: Device) =>
  createAppQueryPersistOptions({ storage, keyProvider, randomBytes: testRandomBytes });

/** Reads and rewrites the decrypted cache, to simulate disk data from another version or corrupted. */
const editStoredCache = async (device: Device, edit: (json: string) => string) => {
  const sealed = createEncryptedStorage({
    storage: device.storage,
    keyProvider: device.keyProvider,
    cipher: createAesGcmCipher({ randomBytes: testRandomBytes }),
  });
  const json = (await sealed.getItem(PERSISTED_CACHE_KEY)) ?? "";
  await sealed.setItem(PERSISTED_CACHE_KEY, edit(json));
};

/** First launch: load two pages and persist the cache. */
const persistTwoPages = async (device: Device) => {
  const { Wrapper, queryClient } = createMovementsWrapper({ mock: { total: 60 } });
  const { result } = await renderHook(() => useMovementsInfiniteQuery(), { wrapper: Wrapper });
  await waitFor(() => expect(result.current.data?.items).toHaveLength(20));
  await act(async () => {
    await result.current.fetchNextPage();
  });
  await waitFor(() => expect(result.current.data?.items).toHaveLength(40));

  await persistQueryClientSave({ queryClient, ...persistOptions(device) });
  return result.current.data?.items ?? [];
};

describe("movements cache persistence", () => {
  it("restores the first page with real Date instances after an encrypted round-trip", async () => {
    const device = createDevice();
    const original = await persistTwoPages(device);

    // Next launch: a new client hydrated from storage, with no network.
    const queryClient = createTestQueryClient();
    await persistQueryClientRestore({ queryClient, ...persistOptions(device) });
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

  it("keeps no movement data in plain text on disk", async () => {
    const device = createDevice();
    const original = await persistTwoPages(device);

    const [first] = original;
    if (!first) throw new Error("expected a persisted movement");
    const raw = device.storage.items.get(PERSISTED_CACHE_KEY) ?? "";
    expect(raw.startsWith("v1:")).toBe(true);
    expect(raw).not.toContain(first.counterparty.name);
    expect(raw).not.toContain(first.date.toISOString());
  });

  it("starts empty, and clears the disk, when the stored cache cannot be decrypted", async () => {
    const device = createDevice();
    await persistTwoPages(device);

    // Same disk, but the keychain entry is gone: a new key cannot open the old cache.
    const queryClient = createTestQueryClient();
    await persistQueryClientRestore({
      queryClient,
      ...persistOptions({ storage: device.storage, keyProvider: createMemoryKeyProvider() }),
    });

    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
    expect(device.storage.items.has(PERSISTED_CACHE_KEY)).toBe(false);
  });

  it("discards a cache written for another contract version", async () => {
    const device = createDevice();
    await persistTwoPages(device);
    await editStoredCache(device, (json) =>
      JSON.stringify({ ...(JSON.parse(json) as object), buster: "items-0.9.0/snapshot-0" }),
    );

    const queryClient = createTestQueryClient();
    await persistQueryClientRestore({ queryClient, ...persistOptions(device) });

    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
    expect(device.storage.items.has(PERSISTED_CACHE_KEY)).toBe(false);
  });

  it("drops a restored movements snapshot that fails validation", async () => {
    const device = createDevice();
    await persistTwoPages(device);
    // Corrupt the amount of the first stored movement.
    await editStoredCache(device, (json) => json.replace(/"value":-?[\d.]+/, '"value":"oops"'));

    const queryClient = createTestQueryClient();
    await persistQueryClientRestore({ queryClient, ...persistOptions(device) });

    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
  });
});
