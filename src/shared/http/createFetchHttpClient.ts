import type { HttpClient } from "./HttpClient";
import { HttpError, HttpTimeoutError, NETWORK_ERROR_STATUS } from "./HttpError";
import { buildUrl } from "./buildUrl";

/** The subset of `fetch` this adapter uses (string URL only). */
export type FetchFn = (url: string, init: RequestInit) => Promise<Response>;

/** Deadline for a whole request (headers and body) when none is configured. */
export const DEFAULT_REQUEST_TIMEOUT_MS = 10_000;

export interface FetchHttpClientOptions {
  readonly baseUrl: string;
  /** Injectable for tests; defaults to the global `fetch`. */
  readonly fetch?: FetchFn;
  /** Client-side deadline per request, in milliseconds. */
  readonly timeoutMs?: number;
}

/**
 * Links the caller's signal (if any) to a deadline. Built by hand rather than with
 * `AbortSignal.any`/`AbortSignal.timeout`, which React Native's abort polyfill does not guarantee.
 */
const createRequestSignal = (timeoutMs: number, callerSignal: AbortSignal | undefined) => {
  const controller = new AbortController();
  let timedOut = false;
  const abortFromCaller = () => controller.abort();
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  if (callerSignal?.aborted) controller.abort();
  else callerSignal?.addEventListener("abort", abortFromCaller);

  return {
    signal: controller.signal,
    hasTimedOut: () => timedOut,
    dispose: () => {
      clearTimeout(timer);
      callerSignal?.removeEventListener("abort", abortFromCaller);
    },
  };
};

/** `HttpClient` adapter over `fetch`, with a per-request deadline. */
export const createFetchHttpClient = ({
  baseUrl,
  fetch: fetchImpl,
  timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
}: FetchHttpClientOptions): HttpClient => ({
  get: async (path, { query, signal: callerSignal } = {}) => {
    const doFetch: FetchFn = fetchImpl ?? ((url, init) => globalThis.fetch(url, init));
    const request = createRequestSignal(timeoutMs, callerSignal);

    /** Maps an abort to the right outcome: a timeout is a failure, a cancellation is not. */
    const rethrowIfAborted = (error: unknown): void => {
      if (request.hasTimedOut()) throw new HttpTimeoutError(timeoutMs);
      // A cancelled request is not a failure: let the caller (e.g. React Query) recognise it.
      if (callerSignal?.aborted) throw error;
    };

    try {
      let response: Response;
      try {
        response = await doFetch(buildUrl(baseUrl, path, query), {
          method: "GET",
          headers: { Accept: "application/json" },
          signal: request.signal,
        });
      } catch (error) {
        rethrowIfAborted(error);
        throw new HttpError(NETWORK_ERROR_STATUS, "Network request failed");
      }

      if (!response.ok) {
        throw new HttpError(response.status, `Request failed with status ${response.status}`);
      }

      try {
        return (await response.json()) as unknown;
      } catch (error) {
        // The body is streamed after the headers, so a cancellation or the deadline can land here.
        rethrowIfAborted(error);
        throw new HttpError(response.status, "Response body is not valid JSON");
      }
    } finally {
      request.dispose();
    }
  },
});
