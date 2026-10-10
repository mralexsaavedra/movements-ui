import type { InfiniteData } from "@tanstack/react-query";

import type { Movement } from "../../domain/Movement";
import type { MovementSnapshot, MovementsPageSnapshot } from "./movementsPageSnapshot";

/** What the UI consumes: every loaded page flattened into one list. */
export interface MovementList {
  readonly items: readonly Movement[];
  /** Items dropped for breaking the contract, summed across loaded pages. */
  readonly invalidCount: number;
  /** Pages loaded so far (bounds the automatic skip over pages with no valid items). */
  readonly pageCount: number;
}

// Structural sharing keeps snapshots of unchanged rows referentially stable across fetches, so
// memoising per snapshot hands the list the same `Movement` objects and memoised rows skip work.
// `null` marks a snapshot that cannot be revived.
const revived = new WeakMap<MovementSnapshot, Movement | null>();

/**
 * Restored snapshots are validated against the snapshot schema before they reach the cache
 * (`isRestorableMovementsQuery`); this cheap date check is a last guard so an `Invalid Date` can
 * never reach the UI. Such rows are dropped like any other invalid item.
 */
const toMovement = (snapshot: MovementSnapshot): Movement | null => {
  const cached = revived.get(snapshot);
  if (cached !== undefined) return cached;
  const date = new Date(snapshot.date);
  const movement: Movement | null = Number.isNaN(date.getTime()) ? null : { ...snapshot, date };
  revived.set(snapshot, movement);
  return movement;
};

/**
 * `select` for the movements infinite query. Cursor pages can overlap (e.g. a movement inserted
 * between two fetches shifts the window), so items are deduplicated by id across all pages and
 * the first occurrence wins.
 */
export const selectMovementList = (
  data: InfiniteData<MovementsPageSnapshot, string | undefined>,
): MovementList => {
  const seen = new Set<string>();
  const items: Movement[] = [];
  let invalidCount = 0;

  for (const page of data.pages) {
    invalidCount += page.invalidCount;
    for (const snapshot of page.items) {
      if (seen.has(snapshot.id)) continue;
      const movement = toMovement(snapshot);
      if (!movement) {
        invalidCount += 1;
        continue;
      }
      seen.add(snapshot.id);
      items.push(movement);
    }
  }

  return { items, invalidCount, pageCount: data.pages.length };
};
