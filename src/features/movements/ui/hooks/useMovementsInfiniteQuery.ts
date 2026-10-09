import { useInfiniteQuery } from "@tanstack/react-query";

import { fetchMovementsPageSnapshot } from "../cache/fetchMovementsPageSnapshot";
import { movementsKeys } from "../cache/movementsKeys";
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
    queryFn: ({ pageParam, signal }) =>
      fetchMovementsPageSnapshot(repository, { limit, pageParam, signal }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    select: selectMovementList,
  });
};
