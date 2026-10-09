import type { Movement, MovementsPage } from "../../domain/Movement";

/**
 * Version of the cached page shape. The persisted cache is discarded when it changes, so bump it
 * whenever the contract (`contract/openapi.yaml`) or the snapshot shape below changes.
 */
export const MOVEMENTS_CACHE_VERSION = "items-1.0.0/snapshot-1";

/** A `Movement` as stored in the query cache: JSON-safe, with the date as an ISO 8601 string. */
export type MovementSnapshot = Omit<Movement, "date"> & { readonly date: string };

export interface MovementsPageSnapshot {
  readonly items: readonly MovementSnapshot[];
  readonly nextCursor: string | null;
  readonly invalidCount: number;
}

/**
 * The query cache is persisted as JSON, which would silently turn `Date`s into strings on the
 * next launch. Caching a JSON-safe snapshot instead (dates revived in `selectMovementList`) keeps
 * in-memory and restored data identical, and lets structural sharing keep unchanged rows stable.
 */
export const toPageSnapshot = (page: MovementsPage): MovementsPageSnapshot => ({
  items: page.items.map((movement) => ({ ...movement, date: movement.date.toISOString() })),
  nextCursor: page.nextCursor,
  invalidCount: page.invalidCount,
});
