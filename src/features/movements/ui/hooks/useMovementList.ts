import { useState } from "react";

import { type InfiniteData, useQueryClient } from "@tanstack/react-query";

import type { Movement } from "../../domain/Movement";
import { movementsKeys } from "../cache/movementsKeys";
import type { MovementsPageSnapshot } from "../cache/movementsPageSnapshot";
import { MOVEMENTS_PAGE_SIZE, useMovementsInfiniteQuery } from "./useMovementsInfiniteQuery";

export type MovementListStatus = "loading" | "error" | "empty" | "success";

export interface MovementListController {
  /** `error` and `empty` only describe the first load; later failures keep `success` + `error`. */
  readonly status: MovementListStatus;
  readonly items: readonly Movement[];
  readonly invalidCount: number;
  /** A user-initiated refresh is in flight (background refetches stay silent). */
  readonly isRefreshing: boolean;
  readonly isFetchingNextPage: boolean;
  readonly hasNextPage: boolean;
  /** Last failure, also while stale rows are shown (for a banner). `null` once a fetch succeeds. */
  readonly error: Error | null;
  /** Fetches the next page; a no-op while fetching, at the end, or after a failed page. */
  readonly loadMore: () => void;
  /** Pull-to-refresh: refetches the first page without blanking the rows on screen. */
  readonly refresh: () => Promise<void>;
  /** Retries whatever failed: the failed next page, or the whole list. */
  readonly retry: () => void;
}

const NO_MOVEMENTS: readonly Movement[] = [];

/** Without data, a retry in flight shows the loading state again rather than the stale error. */
const toStatus = (
  hasData: boolean,
  isError: boolean,
  isFetching: boolean,
  itemCount: number,
): MovementListStatus => {
  if (!hasData) return isError && !isFetching ? "error" : "loading";
  return itemCount === 0 ? "empty" : "success";
};

type CachedPages = InfiniteData<MovementsPageSnapshot, string | undefined>;

/** UI-facing state of the movements list; the view renders it and calls its actions. */
export const useMovementList = (): MovementListController => {
  const queryClient = useQueryClient();
  const query = useMovementsInfiniteQuery(MOVEMENTS_PAGE_SIZE);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const items = query.data?.items ?? NO_MOVEMENTS;
  const status = toStatus(query.data !== undefined, query.isError, query.isFetching, items.length);

  const loadMore = () => {
    // After a failed page, onEndReached would otherwise retry in a loop: retry is explicit.
    if (!query.hasNextPage || query.isFetching || query.isFetchNextPageError) return;
    void query.fetchNextPage();
  };

  const refresh = async () => {
    // Pull-to-refresh happens at the top of the list: refetch only the first page instead of
    // every loaded page in sequence. Rows below it drop off; the visible ones stay on screen.
    queryClient.setQueryData<CachedPages>(
      movementsKeys.list({ limit: MOVEMENTS_PAGE_SIZE }),
      (data) =>
        data && data.pages.length > 1
          ? { pages: data.pages.slice(0, 1), pageParams: data.pageParams.slice(0, 1) }
          : data,
    );
    setIsRefreshing(true);
    try {
      await query.refetch();
    } finally {
      setIsRefreshing(false);
    }
  };

  const retry = () => {
    if (query.isFetchNextPageError) void query.fetchNextPage();
    else void query.refetch();
  };

  return {
    status,
    items,
    invalidCount: query.data?.invalidCount ?? 0,
    isRefreshing,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: query.hasNextPage,
    error: query.error,
    loadMore,
    refresh,
    retry,
  };
};
