import { useEffect, useRef, useState } from "react";

import { type InfiniteData, onlineManager, useQueryClient } from "@tanstack/react-query";

import { useIsOnline } from "@/shared/query/useIsOnline";

import type { Movement } from "../../domain/Movement";
import { fetchMovementsPageSnapshot } from "../cache/fetchMovementsPageSnapshot";
import { movementsKeys } from "../cache/movementsKeys";
import type { MovementsPageSnapshot } from "../cache/movementsPageSnapshot";
import { useMovementRepository } from "./useMovementRepository";
import { MOVEMENTS_PAGE_SIZE, useMovementsInfiniteQuery } from "./useMovementsInfiniteQuery";

export type MovementListStatus = "loading" | "error" | "empty" | "success";

/**
 * When loaded pages hold no valid item but more exist, the next pages are fetched automatically
 * (an empty list cannot trigger "end reached"), up to this many pages in total.
 */
export const MAX_AUTO_FETCHED_PAGES = 5;

export interface MovementListController {
  /** `error` and `empty` only describe a list with nothing to show; otherwise `success` + `error`. */
  readonly status: MovementListStatus;
  readonly items: readonly Movement[];
  readonly invalidCount: number;
  /** A user-initiated refresh is in flight (background refetches stay silent). */
  readonly isRefreshing: boolean;
  readonly isFetchingNextPage: boolean;
  readonly hasNextPage: boolean;
  /** No connectivity: queries are paused and `refresh` does nothing (show a banner). */
  readonly isOffline: boolean;
  /** Last failure, also while stale rows are shown (for a banner). `null` once a fetch succeeds. */
  readonly error: Error | null;
  /** Fetches the next page; a no-op while fetching, at the end, or after a failed page. */
  readonly loadMore: () => void;
  /** Pull-to-refresh: replaces the list with a fresh first page only if that fetch succeeds. */
  readonly refresh: () => Promise<void>;
  /**
   * Retries whatever failed: the failed next page, a failed refresh, or the whole list. Retrying a
   * failed refresh while offline does nothing; `error` and `isOffline` stay set for the UI.
   */
  readonly retry: () => void;
}

const NO_MOVEMENTS: readonly Movement[] = [];

type CachedPages = InfiniteData<MovementsPageSnapshot, string | undefined>;

interface RefreshFailure {
  readonly error: Error;
  /** `dataUpdatedAt` of the cached list when the refresh failed (a version, not a clock). */
  readonly dataUpdatedAt: number;
}

const shouldSkipEmptyPages = (
  itemCount: number,
  hasNextPage: boolean,
  pageCount: number,
  isFetchNextPageError: boolean,
): boolean =>
  itemCount === 0 && hasNextPage && pageCount < MAX_AUTO_FETCHED_PAGES && !isFetchNextPageError;

const toError = (error: unknown): Error =>
  error instanceof Error ? error : new Error("Refresh failed");

/** UI-facing state of the movements list; the view renders it and calls its actions. */
export const useMovementList = (): MovementListController => {
  const queryClient = useQueryClient();
  const repository = useMovementRepository();
  const query = useMovementsInfiniteQuery(MOVEMENTS_PAGE_SIZE);
  const { fetchNextPage, hasNextPage, isFetching, isFetchNextPageError } = query;
  const isOnline = useIsOnline();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshFailure, setRefreshFailure] = useState<RefreshFailure | null>(null);
  // Refs, not state: two calls in the same tick see the same render closure.
  const inFlightRefresh = useRef<Promise<void> | null>(null);
  const refreshAbort = useRef<AbortController | null>(null);

  // A refresh runs outside React Query, so it is cancelled explicitly when the list unmounts.
  useEffect(() => () => refreshAbort.current?.abort(), []);

  const items = query.data?.items ?? NO_MOVEMENTS;
  const pageCount = query.data?.pageCount ?? 0;
  const itemCount = items.length;
  const isSkippingEmptyPages = shouldSkipEmptyPages(
    itemCount,
    hasNextPage,
    pageCount,
    isFetchNextPageError,
  );

  // Depends on `pageCount` (not only the derived flag) to re-arm for each new page: the fetching
  // flag can flip back to idle within one batched render, leaving the flag unchanged.
  useEffect(() => {
    if (isFetching) return;
    if (shouldSkipEmptyPages(itemCount, hasNextPage, pageCount, isFetchNextPageError)) {
      void fetchNextPage();
    }
  }, [itemCount, hasNextPage, pageCount, isFetchNextPageError, isFetching, fetchNextPage]);

  // A refresh failure stays relevant until newer data lands in the cache.
  const visibleRefreshError =
    refreshFailure && refreshFailure.dataUpdatedAt === query.dataUpdatedAt
      ? refreshFailure.error
      : null;

  const status = ((): MovementListStatus => {
    if (query.data === undefined) return query.isError && !isFetching ? "error" : "loading";
    if (itemCount > 0) return "success";
    if (isSkippingEmptyPages) return "loading";
    return isFetchNextPageError ? "error" : "empty";
  })();

  const loadMore = () => {
    // After a failed page, onEndReached would otherwise retry in a loop: retry is explicit.
    if (!hasNextPage || isFetching || isRefreshing || isFetchNextPageError) return;
    void fetchNextPage();
  };

  const runRefresh = async (signal: AbortSignal) => {
    setIsRefreshing(true);
    try {
      // Pull-to-refresh happens at the top of the list: fetch only the first page, and replace
      // the loaded pages with it only once it arrived, so a failure keeps every row on screen.
      const firstPage = await fetchMovementsPageSnapshot(repository, {
        limit: MOVEMENTS_PAGE_SIZE,
        pageParam: undefined,
        signal,
      });
      const queryKey = movementsKeys.list({ limit: MOVEMENTS_PAGE_SIZE });
      await queryClient.cancelQueries({ queryKey });
      queryClient.setQueryData<CachedPages>(queryKey, {
        pages: [firstPage],
        pageParams: [undefined],
      });
      setRefreshFailure(null);
    } catch (error) {
      if (signal.aborted) return;
      // Compare against the data the refresh failed to replace, not the wall clock: with a
      // fast transport both can share a millisecond, which would hide the error.
      setRefreshFailure({
        error: toError(error),
        dataUpdatedAt:
          queryClient.getQueryState(movementsKeys.list({ limit: MOVEMENTS_PAGE_SIZE }))
            ?.dataUpdatedAt ?? 0,
      });
    } finally {
      if (!signal.aborted) setIsRefreshing(false);
    }
  };

  const refresh = (): Promise<void> => {
    // Offline the fetch would pause indefinitely (and the spinner with it): `isOffline` explains.
    if (!onlineManager.isOnline()) return Promise.resolve();
    // Concurrent pulls share the request in flight instead of racing to overwrite the cache.
    if (inFlightRefresh.current) return inFlightRefresh.current;
    const controller = new AbortController();
    refreshAbort.current = controller;
    const run = runRefresh(controller.signal).finally(() => {
      inFlightRefresh.current = null;
      refreshAbort.current = null;
    });
    inFlightRefresh.current = run;
    return run;
  };

  const retry = () => {
    if (isFetchNextPageError) void fetchNextPage();
    else if (visibleRefreshError) void refresh();
    else void query.refetch();
  };

  return {
    status,
    items,
    invalidCount: query.data?.invalidCount ?? 0,
    isRefreshing,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage,
    isOffline: !isOnline,
    error: visibleRefreshError ?? query.error,
    loadMore,
    refresh,
    retry,
  };
};
