/** Status used when no HTTP response was received (offline, DNS, TLS, timeout…). */
export const NETWORK_ERROR_STATUS = 0;

/** A request that did not produce a usable response. Carries no body: it may hold sensitive data. */
export class HttpError extends Error {
  override readonly name = "HttpError";
  /** HTTP status code, or `NETWORK_ERROR_STATUS` (0) when the request never got a response. */
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
