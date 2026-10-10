import { HttpError, HttpTimeoutError, NETWORK_ERROR_STATUS } from "./HttpError";
import {
  DEFAULT_REQUEST_TIMEOUT_MS,
  type FetchFn,
  createFetchHttpClient,
} from "./createFetchHttpClient";

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const createFetchStub = (response: Response | (() => Promise<Response>)) =>
  jest.fn<Promise<Response>, Parameters<FetchFn>>(() =>
    typeof response === "function" ? response() : Promise.resolve(response),
  );

const createAbortError = (): Error => Object.assign(new Error("Aborted"), { name: "AbortError" });

/** A fetch that never settles on its own and rejects like `fetch` when its signal aborts. */
const createHangingFetch = () =>
  jest.fn<Promise<Response>, Parameters<FetchFn>>(
    (_url, init) =>
      new Promise<Response>((_resolve, reject) => {
        if (init.signal?.aborted) {
          reject(createAbortError());
          return;
        }
        init.signal?.addEventListener("abort", () => reject(createAbortError()));
      }),
  );

const requestedUrl = (fetchStub: ReturnType<typeof createFetchStub>): string =>
  String(fetchStub.mock.calls[0]?.[0]);

describe("createFetchHttpClient", () => {
  it("returns the parsed JSON body of a successful response", async () => {
    const fetchStub = createFetchStub(jsonResponse({ items: [], nextCursor: null }));
    const client = createFetchHttpClient({ baseUrl: "https://api.example.com", fetch: fetchStub });

    await expect(client.get("/items")).resolves.toEqual({ items: [], nextCursor: null });
  });

  it("builds the URL from the base URL, the path and the defined query params", async () => {
    const fetchStub = createFetchStub(jsonResponse({}));
    const client = createFetchHttpClient({
      baseUrl: "https://api.example.com/v1/",
      fetch: fetchStub,
    });

    await client.get("/items", { query: { cursor: undefined, limit: 20, q: "a b&c" } });

    expect(requestedUrl(fetchStub)).toBe("https://api.example.com/v1/items?limit=20&q=a%20b%26c");
  });

  it("omits the query string when every param is undefined", async () => {
    const fetchStub = createFetchStub(jsonResponse({}));
    const client = createFetchHttpClient({ baseUrl: "https://api.example.com", fetch: fetchStub });

    await client.get("/items", { query: { cursor: undefined } });

    expect(requestedUrl(fetchStub)).toBe("https://api.example.com/items");
  });

  it("aborts the in-flight fetch when the caller aborts its signal", async () => {
    const controller = new AbortController();
    let abortedDuringFetch: boolean | undefined;
    const fetchStub = jest.fn<Promise<Response>, Parameters<FetchFn>>((_url, init) => {
      controller.abort();
      abortedDuringFetch = init.signal?.aborted;
      return Promise.resolve(jsonResponse({}));
    });
    const client = createFetchHttpClient({ baseUrl: "https://api.example.com", fetch: fetchStub });

    await client.get("/items", { signal: controller.signal });

    expect(abortedDuringFetch).toBe(true);
  });

  it.each([400, 404, 500, 503])(
    "rejects a %i response with an HttpError carrying the status",
    async (status) => {
      const fetchStub = createFetchStub(jsonResponse({ message: "nope" }, status));
      const client = createFetchHttpClient({
        baseUrl: "https://api.example.com",
        fetch: fetchStub,
      });

      const error = await client.get("/items").catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(HttpError);
      expect((error as HttpError).status).toBe(status);
    },
  );

  it("rejects a network failure with an HttpError of status 0", async () => {
    const fetchStub = createFetchStub(() =>
      Promise.reject(new TypeError("Network request failed")),
    );
    const client = createFetchHttpClient({ baseUrl: "https://api.example.com", fetch: fetchStub });

    const error = await client.get("/items").catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(HttpError);
    expect((error as HttpError).status).toBe(0);
  });

  it("rethrows the abort error untouched when the request was cancelled", async () => {
    const controller = new AbortController();
    const abortError = Object.assign(new Error("Aborted"), { name: "AbortError" });
    const fetchStub = createFetchStub(() => {
      controller.abort();
      return Promise.reject(abortError);
    });
    const client = createFetchHttpClient({ baseUrl: "https://api.example.com", fetch: fetchStub });

    await expect(client.get("/items", { signal: controller.signal })).rejects.toBe(abortError);
  });

  it("rethrows the abort error when the request is cancelled while reading the body", async () => {
    const controller = new AbortController();
    const abortError = Object.assign(new Error("Aborted"), { name: "AbortError" });
    const response = jsonResponse({});
    jest.spyOn(response, "json").mockImplementation(() => {
      controller.abort();
      return Promise.reject(abortError);
    });
    const client = createFetchHttpClient({
      baseUrl: "https://api.example.com",
      fetch: createFetchStub(response),
    });

    await expect(client.get("/items", { signal: controller.signal })).rejects.toBe(abortError);
  });

  it("rejects a successful response whose body is not JSON with an HttpError", async () => {
    const fetchStub = createFetchStub(new Response("<html>", { status: 200 }));
    const client = createFetchHttpClient({ baseUrl: "https://api.example.com", fetch: fetchStub });

    const error = await client.get("/items").catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(HttpError);
    expect((error as HttpError).status).toBe(200);
  });

  describe("request timeout", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("aborts the fetch and rejects with a retryable timeout error when the deadline passes", async () => {
      const fetchStub = createHangingFetch();
      const client = createFetchHttpClient({
        baseUrl: "https://api.example.com",
        fetch: fetchStub,
        timeoutMs: 5_000,
      });

      const result = client.get("/items").catch((caught: unknown) => caught);
      jest.advanceTimersByTime(5_000);
      const error = await result;

      expect(fetchStub.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
      expect(error).toBeInstanceOf(HttpTimeoutError);
      expect((error as HttpError).status).toBe(NETWORK_ERROR_STATUS);
    });

    it("applies a default deadline when none is configured", async () => {
      const client = createFetchHttpClient({
        baseUrl: "https://api.example.com",
        fetch: createHangingFetch(),
      });

      const result = client.get("/items").catch((caught: unknown) => caught);
      jest.advanceTimersByTime(DEFAULT_REQUEST_TIMEOUT_MS);

      await expect(result).resolves.toBeInstanceOf(HttpTimeoutError);
    });

    it("surfaces a caller abort before the deadline as an abort, not a timeout", async () => {
      const fetchStub = createHangingFetch();
      const client = createFetchHttpClient({
        baseUrl: "https://api.example.com",
        fetch: fetchStub,
        timeoutMs: 5_000,
      });
      const controller = new AbortController();

      const result = client
        .get("/items", { signal: controller.signal })
        .catch((caught: unknown) => caught);
      jest.advanceTimersByTime(1_000);
      controller.abort();
      const error = await result;

      expect(error).not.toBeInstanceOf(HttpError);
      expect((error as Error).name).toBe("AbortError");
      expect(jest.getTimerCount()).toBe(0);
    });

    it("aborts at once when the caller signal is already aborted", async () => {
      const fetchStub = createHangingFetch();
      const client = createFetchHttpClient({
        baseUrl: "https://api.example.com",
        fetch: fetchStub,
      });
      const controller = new AbortController();
      controller.abort();

      const error = await client
        .get("/items", { signal: controller.signal })
        .catch((caught: unknown) => caught);

      expect(error).not.toBeInstanceOf(HttpError);
      expect(fetchStub.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
      expect(jest.getTimerCount()).toBe(0);
    });

    it("clears the deadline once the request succeeds", async () => {
      const client = createFetchHttpClient({
        baseUrl: "https://api.example.com",
        fetch: createFetchStub(jsonResponse({})),
      });

      await client.get("/items");

      expect(jest.getTimerCount()).toBe(0);
    });

    it("clears the deadline once the request fails", async () => {
      const client = createFetchHttpClient({
        baseUrl: "https://api.example.com",
        fetch: createFetchStub(jsonResponse({}, 500)),
      });

      await client.get("/items").catch(() => undefined);

      expect(jest.getTimerCount()).toBe(0);
    });
  });
});
