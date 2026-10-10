import type { InfiniteData, QueryClient } from "@tanstack/react-query";
import {
  persistQueryClientRestore,
  persistQueryClientSave,
} from "@tanstack/react-query-persist-client";

import { createMemoryStorage } from "@/shared/testing/createMemoryStorage";
import { createTestQueryClient } from "@/shared/testing/createTestQueryClient";

import { MAX_PERSISTED_PAGES, PERSISTED_CACHE_KEY } from "./cachePolicy";
import { createQueryPersistOptions } from "./createQueryPersistOptions";

type Pages = InfiniteData<string, string | undefined>;

const infiniteData = (pageCount: number): Pages => ({
  pages: Array.from({ length: pageCount }, (_, index) => `page-${index + 1}`),
  pageParams: Array.from({ length: pageCount }, (_, index) =>
    index === 0 ? undefined : `cursor-${index + 1}`,
  ),
});

const setup = (
  buster = "v1",
  isRestorableQuery?: (queryKey: readonly unknown[], data: unknown) => boolean,
) => {
  const storage = createMemoryStorage();
  const options = createQueryPersistOptions({
    storage,
    buster,
    shouldPersistQuery: (query) => query.queryKey[0] === "persisted",
    ...(isRestorableQuery ? { isRestorableQuery } : {}),
  });
  return { storage, options };
};

const save = async (queryClient: QueryClient, options: ReturnType<typeof setup>["options"]) =>
  persistQueryClientSave({ queryClient, ...options });

const restoreInto = async (options: ReturnType<typeof setup>["options"]) => {
  const queryClient = createTestQueryClient();
  await persistQueryClientRestore({ queryClient, ...options });
  return queryClient;
};

describe("createQueryPersistOptions", () => {
  it("persists only successful queries the predicate accepts", async () => {
    const { storage, options } = setup();
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(["persisted", "a"], "kept");
    queryClient.setQueryData(["ephemeral"], "skipped");
    await queryClient
      .fetchQuery({
        queryKey: ["persisted", "failed"],
        queryFn: () => Promise.reject(new Error("boom")),
        retry: false,
      })
      .catch(() => undefined);

    await save(queryClient, options);
    const restored = await restoreInto(options);

    expect(storage.items.has(PERSISTED_CACHE_KEY)).toBe(true);
    expect(restored.getQueryData(["persisted", "a"])).toBe("kept");
    expect(restored.getQueryData(["ephemeral"])).toBeUndefined();
    expect(restored.getQueryState(["persisted", "failed"])).toBeUndefined();
  });

  it("writes only the first pages of an infinite query to disk", async () => {
    const { options } = setup();
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(["persisted", "list"], infiniteData(5));

    await save(queryClient, options);
    const restored = await restoreInto(options);

    const data = restored.getQueryData<Pages>(["persisted", "list"]);
    expect(data?.pages).toEqual(infiniteData(MAX_PERSISTED_PAGES).pages);
    expect(data?.pageParams).toHaveLength(MAX_PERSISTED_PAGES);
    // The in-memory cache keeps every loaded page; only the persisted copy is trimmed.
    expect(queryClient.getQueryData<Pages>(["persisted", "list"])?.pages).toHaveLength(5);
  });

  it("discards a persisted cache written with a different buster", async () => {
    const { storage, options } = setup("v1");
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(["persisted", "a"], "old contract");
    await save(queryClient, options);

    const nextVersion = createQueryPersistOptions({
      storage,
      buster: "v2",
      shouldPersistQuery: () => true,
    });
    const restored = await restoreInto(nextVersion);

    expect(restored.getQueryData(["persisted", "a"])).toBeUndefined();
    expect(storage.items.has(PERSISTED_CACHE_KEY)).toBe(false);
  });

  it("drops restored queries the restore check rejects and keeps the rest", async () => {
    const { options } = setup("v1", (queryKey, data) => queryKey[1] !== "checked" || data === "ok");
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(["persisted", "checked", 1], "corrupt");
    queryClient.setQueryData(["persisted", "checked", 2], "ok");
    queryClient.setQueryData(["persisted", "other"], "untouched");

    await save(queryClient, options);
    const restored = await restoreInto(options);

    expect(restored.getQueryState(["persisted", "checked", 1])).toBeUndefined();
    expect(restored.getQueryData(["persisted", "checked", 2])).toBe("ok");
    expect(restored.getQueryData(["persisted", "other"])).toBe("untouched");
  });
});
