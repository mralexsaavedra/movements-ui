import type { AsyncStorage } from "@tanstack/react-query-persist-client";

import { isMovementsQueryKey } from "@/features/movements/ui/cache/movementsKeys";
import { MOVEMENTS_CACHE_VERSION } from "@/features/movements/ui/cache/movementsPageSnapshot";
import {
  type QueryPersistOptions,
  createQueryPersistOptions,
} from "@/shared/query/createQueryPersistOptions";

/**
 * Persists the movements list across launches so the screen paints instantly from disk while
 * fresh data loads. The data is stored unencrypted: encrypting cached financial data at rest is a
 * production follow-up (see README).
 */
export const createAppQueryPersistOptions = (storage: AsyncStorage<string>): QueryPersistOptions =>
  createQueryPersistOptions({
    storage,
    buster: MOVEMENTS_CACHE_VERSION,
    shouldPersistQuery: (query) => isMovementsQueryKey(query.queryKey),
  });
