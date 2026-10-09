import type { HttpClient } from "./HttpClient";
import { HttpError, NETWORK_ERROR_STATUS } from "./HttpError";
import { buildUrl } from "./buildUrl";

/** The subset of `fetch` this adapter uses (string URL only). */
export type FetchFn = (url: string, init: RequestInit) => Promise<Response>;

export interface FetchHttpClientOptions {
  readonly baseUrl: string;
  /** Injectable for tests; defaults to the global `fetch`. */
  readonly fetch?: FetchFn;
}

/** `HttpClient` adapter over `fetch`. */
export const createFetchHttpClient = ({
  baseUrl,
  fetch: fetchImpl,
}: FetchHttpClientOptions): HttpClient => ({
  get: async (path, { query, signal } = {}) => {
    const doFetch: FetchFn = fetchImpl ?? ((url, init) => globalThis.fetch(url, init));
    let response: Response;
    try {
      response = await doFetch(buildUrl(baseUrl, path, query), {
        method: "GET",
        headers: { Accept: "application/json" },
        ...(signal ? { signal } : {}),
      });
    } catch (error) {
      // A cancelled request is not a failure: let the caller (e.g. React Query) recognise it.
      if (signal?.aborted) throw error;
      throw new HttpError(NETWORK_ERROR_STATUS, "Network request failed");
    }

    if (!response.ok) {
      throw new HttpError(response.status, `Request failed with status ${response.status}`);
    }

    try {
      return (await response.json()) as unknown;
    } catch {
      throw new HttpError(response.status, "Response body is not valid JSON");
    }
  },
});
