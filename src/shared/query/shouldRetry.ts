import { HttpError, NETWORK_ERROR_STATUS } from "@/shared/http/HttpError";

import { MAX_QUERY_RETRIES } from "./cachePolicy";

/** Transient failures: no response at all, or a server-side error. */
const isTransient = (error: unknown): boolean =>
  error instanceof HttpError && (error.status === NETWORK_ERROR_STATUS || error.status >= 500);

/**
 * Retry predicate for React Query. Client errors (4xx) and contract violations would fail the
 * same way again, so they surface immediately; unknown errors are not retried either.
 */
export const shouldRetry = (failureCount: number, error: unknown): boolean =>
  failureCount < MAX_QUERY_RETRIES && isTransient(error);
