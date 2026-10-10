import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { type InfiniteData, type Query, defaultShouldDehydrateQuery } from "@tanstack/react-query";
import type {
  AsyncStorage,
  PersistQueryClientOptions,
  PersistedClient,
} from "@tanstack/react-query-persist-client";

import { MAX_PERSISTED_PAGES, PERSISTED_CACHE_KEY, PERSIST_MAX_AGE_MS } from "./cachePolicy";

export interface QueryPersistConfig {
  readonly storage: AsyncStorage<string>;
  /** Bump it whenever the cached data shape changes: caches with another buster are discarded. */
  readonly buster: string;
  /** Which successful queries are worth writing to disk. */
  readonly shouldPersistQuery: (query: Query) => boolean;
  /**
   * Checked for every query read back from disk; a query it rejects is dropped before it reaches
   * the cache, so it starts empty and fetches. Disk data can be corrupt or stale in shape.
   */
  readonly isRestorableQuery?: (queryKey: readonly unknown[], data: unknown) => boolean;
}

export type QueryPersistOptions = Omit<PersistQueryClientOptions, "queryClient">;

const isInfiniteData = (data: unknown): data is InfiniteData<unknown, unknown> =>
  typeof data === "object" &&
  data !== null &&
  "pages" in data &&
  "pageParams" in data &&
  Array.isArray(data.pages) &&
  Array.isArray(data.pageParams);

/** Keeps only the first pages of every infinite query; the in-memory cache is not touched. */
export const limitPersistedPages = (
  client: PersistedClient,
  maxPages: number,
): PersistedClient => ({
  ...client,
  clientState: {
    ...client.clientState,
    queries: client.clientState.queries.map((query) => {
      const { data } = query.state;
      if (!isInfiniteData(data) || data.pages.length <= maxPages) return query;
      return {
        ...query,
        state: {
          ...query.state,
          data: {
            pages: data.pages.slice(0, maxPages),
            pageParams: data.pageParams.slice(0, maxPages),
          },
        },
      };
    }),
  },
});

/** Drops the restored queries `isRestorableQuery` rejects. */
export const keepRestorableQueries = (
  client: PersistedClient,
  isRestorableQuery: (queryKey: readonly unknown[], data: unknown) => boolean,
): PersistedClient => ({
  ...client,
  clientState: {
    ...client.clientState,
    queries: client.clientState.queries.filter((query) =>
      isRestorableQuery(query.queryKey, query.state.data),
    ),
  },
});

/**
 * Options for `PersistQueryClientProvider`: successful, selected queries are written to `storage`
 * (first pages only) and restored on the next launch unless older than `PERSIST_MAX_AGE_MS` or
 * written with another `buster`. Queries failing `isRestorableQuery` are dropped on restore, so
 * fresh in-memory data is never re-validated. Storage failures are swallowed by the persister: the app keeps
 * working with an in-memory cache.
 */
export const createQueryPersistOptions = ({
  storage,
  buster,
  shouldPersistQuery,
  isRestorableQuery,
}: QueryPersistConfig): QueryPersistOptions => ({
  persister: createAsyncStoragePersister({
    storage,
    key: PERSISTED_CACHE_KEY,
    serialize: (client) => JSON.stringify(limitPersistedPages(client, MAX_PERSISTED_PAGES)),
    deserialize: (cached) => {
      const client = JSON.parse(cached) as PersistedClient;
      return isRestorableQuery ? keepRestorableQueries(client, isRestorableQuery) : client;
    },
  }),
  maxAge: PERSIST_MAX_AGE_MS,
  buster,
  dehydrateOptions: {
    shouldDehydrateQuery: (query) =>
      defaultShouldDehydrateQuery(query) && shouldPersistQuery(query),
  },
});
