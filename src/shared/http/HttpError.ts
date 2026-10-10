/** Status used when no HTTP response was received (offline, DNS, TLS, timeout…). */
export const NETWORK_ERROR_STATUS = 0;

/** A request that did not produce a usable response. Carries no body: it may hold sensitive data. */
export class HttpError extends Error {
  override readonly name: string = "HttpError";
  /** HTTP status code, or `NETWORK_ERROR_STATUS` (0) when the request never got a response. */
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/**
 * The request hit the client-side deadline before a response arrived. It is a network failure
 * (status 0), so callers retry it like any other missing response.
 */
export class HttpTimeoutError extends HttpError {
  override readonly name = "HttpTimeoutError";
  readonly timeoutMs: number;

  constructor(timeoutMs: number) {
    super(NETWORK_ERROR_STATUS, `Request timed out after ${timeoutMs} ms`);
    this.timeoutMs = timeoutMs;
  }
}
