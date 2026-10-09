import { HttpError, NETWORK_ERROR_STATUS } from "@/shared/http/HttpError";

import { MAX_QUERY_RETRIES } from "./cachePolicy";
import { shouldRetry } from "./shouldRetry";

describe("shouldRetry", () => {
  it.each([
    ["a network failure", new HttpError(NETWORK_ERROR_STATUS, "offline")],
    ["a 500", new HttpError(500, "boom")],
    ["a 503", new HttpError(503, "unavailable")],
  ])("retries %s", (_, error) => {
    expect(shouldRetry(0, error)).toBe(true);
  });

  it.each([
    ["a 400", new HttpError(400, "bad request")],
    ["a 404", new HttpError(404, "not found")],
    ["a non-HTTP error (e.g. a contract violation)", new TypeError("invalid payload")],
    ["an unknown error", new Error("unexpected")],
  ])("does not retry %s", (_, error) => {
    expect(shouldRetry(0, error)).toBe(false);
  });

  it("stops after the maximum number of retries", () => {
    const error = new HttpError(503, "unavailable");

    expect(shouldRetry(MAX_QUERY_RETRIES - 1, error)).toBe(true);
    expect(shouldRetry(MAX_QUERY_RETRIES, error)).toBe(false);
  });
});
