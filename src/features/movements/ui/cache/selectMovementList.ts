import type { InfiniteData } from "@tanstack/react-query";

import type { Movement } from "../../domain/Movement";
import type { MovementSnapshot, MovementsPageSnapshot } from "./movementsPageSnapshot";

/** What the UI consumes: every loaded page flattened into one list. */
export interface MovementList {
  readonly items: readonly Movement[];
  /** Items dropped for breaking the contract, summed across loaded pages. */
  readonly invalidCount: number;
}

// Structural sharing keeps snapshots of unchanged rows referentially stable across fetches, so
// memoising per snapshot hands the list the same `Movement` objects and memoised rows skip work.
const revived = new WeakMap<MovementSnapshot, Movement>();

const toMovement = (snapshot: MovementSnapshot): Movement => {
  const cached = revived.get(snapshot);
  if (cached) return cached;
  const movement: Movement = { ...snapshot, date: new Date(snapshot.date) };
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
      seen.add(snapshot.id);
      items.push(toMovement(snapshot));
    }
  }

  return { items, invalidCount };
};
