import type { MovementRepository } from "../../domain/MovementRepository";
import { type MovementsPageSnapshot, toPageSnapshot } from "./movementsPageSnapshot";

interface FetchMovementsPageParams {
  readonly limit: number;
  /** `undefined` (or `null`, as restored from JSON) means the first page. */
  readonly pageParam: string | null | undefined;
  readonly signal?: AbortSignal;
}

/** Loads one page through the repository and returns its cacheable snapshot. */
export const fetchMovementsPageSnapshot = async (
  repository: MovementRepository,
  { limit, pageParam, signal }: FetchMovementsPageParams,
): Promise<MovementsPageSnapshot> =>
  toPageSnapshot(
    await repository.getMovements({
      limit,
      ...(signal ? { signal } : {}),
      ...(typeof pageParam === "string" ? { cursor: pageParam } : {}),
    }),
  );
