import type { HttpClient } from "@/shared/http/HttpClient";

import type { ContractViolationReporter } from "../../domain/ContractViolationReporter";
import type { MovementRepository } from "../../domain/MovementRepository";
import { parseMovementsPage } from "../parseMovementsPage";

export interface HttpMovementRepositoryDeps {
  readonly httpClient: HttpClient;
  readonly reporter: ContractViolationReporter;
}

export const ITEMS_PATH = "/items";

/**
 * `MovementRepository` over `GET /items`. Works with any `HttpClient` (real `fetch` or the
 * seeded mock), so the same validation and invalid-data policy run in both cases.
 */
export const createHttpMovementRepository = ({
  httpClient,
  reporter,
}: HttpMovementRepositoryDeps): MovementRepository => ({
  getMovements: async ({ cursor, limit, signal }) => {
    const raw = await httpClient.get(ITEMS_PATH, {
      query: { cursor, limit },
      ...(signal ? { signal } : {}),
    });
    return parseMovementsPage(raw, reporter);
  },
});
