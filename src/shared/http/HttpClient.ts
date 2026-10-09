export type QueryParamValue = string | number | undefined;

export interface HttpRequestOptions {
  /** Query string params; `undefined` values are omitted. */
  readonly query?: Readonly<Record<string, QueryParamValue>>;
  readonly signal?: AbortSignal;
}

/**
 * Minimal transport port: one JSON `GET`. The body is returned as `unknown` on purpose,
 * callers must validate it before use (see `parseMovementsPage`).
 *
 * Rejects with `HttpError` on a non-2xx status or a network failure, and with the original
 * abort error when the signal cancels the request.
 */
export interface HttpClient {
  readonly get: (path: string, options?: HttpRequestOptions) => Promise<unknown>;
}
