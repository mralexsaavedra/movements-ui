import type { MovementsPage } from "./Movement";

export interface GetMovementsParams {
  readonly cursor?: string;
  readonly limit: number;
  /** Cancels the request (e.g. the screen unmounted or the query was superseded). */
  readonly signal?: AbortSignal;
}

/** Port implemented by infrastructure adapters (HTTP, mock) and injected into the UI. */
export interface MovementRepository {
  readonly getMovements: (params: GetMovementsParams) => Promise<MovementsPage>;
}
