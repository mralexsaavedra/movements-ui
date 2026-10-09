import type { ContractViolationReporter } from "@/features/movements/domain/ContractViolationReporter";
import type { MovementRepository } from "@/features/movements/domain/MovementRepository";
import {
  type MockMovementsHttpClientOptions,
  createMockMovementsHttpClient,
} from "@/features/movements/infrastructure/mock/createMockMovementsHttpClient";
import { createHttpMovementRepository } from "@/features/movements/infrastructure/repositories/createHttpMovementRepository";
import type { HttpClient } from "@/shared/http/HttpClient";
import { createFetchHttpClient } from "@/shared/http/createFetchHttpClient";

/**
 * Composition root: the only place that picks concrete adapters. The UI receives the
 * repository through a provider and never imports from here directly.
 */

export type ApiConfig =
  | { readonly mode: "mock"; readonly mock?: MockMovementsHttpClientOptions }
  | { readonly mode: "http"; readonly baseUrl: string };

export interface ApiEnv {
  readonly EXPO_PUBLIC_API_MODE?: string | undefined;
  readonly EXPO_PUBLIC_API_BASE_URL?: string | undefined;
}

/**
 * Expo inlines `EXPO_PUBLIC_*` variables at build time, and only for literal
 * `process.env.NAME` accesses, so they are read one by one here.
 */
const readProcessEnv = (): ApiEnv => ({
  EXPO_PUBLIC_API_MODE: process.env.EXPO_PUBLIC_API_MODE,
  EXPO_PUBLIC_API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL,
});

/** Mock by default; a misconfigured HTTP mode fails at startup instead of on the first request. */
export const readApiConfig = (env: ApiEnv = readProcessEnv()): ApiConfig => {
  // An empty value (e.g. `EXPO_PUBLIC_API_MODE=` copied from an example file) means "unset".
  const mode = env.EXPO_PUBLIC_API_MODE?.trim() || "mock";
  if (mode === "mock") return { mode };
  if (mode === "http") {
    const baseUrl = env.EXPO_PUBLIC_API_BASE_URL?.trim();
    if (!baseUrl)
      throw new Error("EXPO_PUBLIC_API_BASE_URL is required when EXPO_PUBLIC_API_MODE=http");
    return { mode, baseUrl };
  }
  throw new Error(`Unsupported EXPO_PUBLIC_API_MODE "${mode}" (expected "mock" or "http")`);
};

/**
 * Dropped-item reports carry ids, indexes and issue paths only (no money values), so they are
 * safe to log in development. Production would forward them to a crash/analytics reporter.
 */
const contractViolationReporter: ContractViolationReporter = {
  reportInvalidItem: (report) => {
    if (__DEV__) console.warn("[contract] dropped invalid movement", report);
  },
};

const createHttpClient = (config: ApiConfig): HttpClient =>
  config.mode === "http"
    ? createFetchHttpClient({ baseUrl: config.baseUrl })
    : createMockMovementsHttpClient(config.mock);

export const createMovementRepository = (config: ApiConfig = readApiConfig()): MovementRepository =>
  createHttpMovementRepository({
    httpClient: createHttpClient(config),
    reporter: contractViolationReporter,
  });
