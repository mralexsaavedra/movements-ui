import type { ReactNode } from "react";

import { type QueryClient, QueryClientProvider } from "@tanstack/react-query";

import type { HttpClient } from "@/shared/http/HttpClient";
import { createTestQueryClient } from "@/shared/testing/createTestQueryClient";

import type { ContractViolationReporter } from "../domain/ContractViolationReporter";
import {
  type MockMovementsHttpClientOptions,
  createMockMovementsHttpClient,
} from "../infrastructure/mock/createMockMovementsHttpClient";
import { createHttpMovementRepository } from "../infrastructure/repositories/createHttpMovementRepository";
import { MovementRepositoryProvider } from "../ui/providers/MovementRepositoryProvider";

interface MovementsWrapperOptions {
  /** Options for the seeded mock transport (`latencyMs` defaults to 0). */
  readonly mock?: MockMovementsHttpClientOptions;
  /** Replaces the mock transport entirely (e.g. to switch failures on and off). */
  readonly httpClient?: HttpClient;
  readonly queryClient?: QueryClient;
}

/**
 * Real repository (validation + mapping) over the mock transport, a fresh `QueryClient` and the
 * repository provider: hook tests exercise the same stack as the app.
 */
export const createMovementsWrapper = ({
  mock,
  httpClient,
  queryClient = createTestQueryClient(),
}: MovementsWrapperOptions = {}) => {
  const reporter: jest.Mocked<ContractViolationReporter> = { reportInvalidItem: jest.fn() };
  const repository = createHttpMovementRepository({
    httpClient: httpClient ?? createMockMovementsHttpClient({ latencyMs: 0, ...mock }),
    reporter,
  });

  function Wrapper({ children }: { readonly children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MovementRepositoryProvider repository={repository}>{children}</MovementRepositoryProvider>
      </QueryClientProvider>
    );
  }

  return { Wrapper, queryClient, reporter };
};
