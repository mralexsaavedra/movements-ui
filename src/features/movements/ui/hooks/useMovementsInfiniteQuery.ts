import { useInfiniteQuery } from "@tanstack/react-query";

import { movementsKeys } from "../cache/movementsKeys";
import { toPageSnapshot } from "../cache/movementsPageSnapshot";
import { selectMovementList } from "../cache/selectMovementList";
import { useMovementRepository } from "./useMovementRepository";

/** Page size requested from `GET /items` (the contract default). */
export const MOVEMENTS_PAGE_SIZE = 20;

/**
 * Cursor-paginated movements. Cache timing and retries come from the app `QueryClient` defaults
 * (`shared/query/cachePolicy.ts`). No `maxPages`: the contract has no previous-page cursor, so
 * dropped pages could not be refetched when scrolling back up.
 */
export const useMovementsInfiniteQuery = (limit: number = MOVEMENTS_PAGE_SIZE) => {
  const repository = useMovementRepository();

  return useInfiniteQuery({
    queryKey: movementsKeys.list({ limit }),
    queryFn: async ({ pageParam, signal }) => {
      const page = await repository.getMovements({
        limit,
        signal,
        // A restored cache stores the first page param as `null` (JSON has no `undefined`).
        ...(typeof pageParam === "string" ? { cursor: pageParam } : {}),
      });
      return toPageSnapshot(page);
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    select: selectMovementList,
  });
};
