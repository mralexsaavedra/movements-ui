import { isMovementsQueryKey } from "./movementsKeys";
import { movementsInfiniteSnapshotSchema } from "./movementsPageSnapshotSchema";

/**
 * Restore check for the persisted cache: a movements query read from disk is kept only if its
 * data still matches the snapshot shape. A corrupt one is dropped before it reaches `select`, so
 * the list starts without it and fetches fresh data. Other queries are not this feature's call.
 */
export const isRestorableMovementsQuery = (queryKey: readonly unknown[], data: unknown): boolean =>
  !isMovementsQueryKey(queryKey) || movementsInfiniteSnapshotSchema.safeParse(data).success;
