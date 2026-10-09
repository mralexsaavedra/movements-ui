import { HttpError } from "./HttpError";
import { type FetchFn, createFetchHttpClient } from "./createFetchHttpClient";

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const createFetchStub = (response: Response | (() => Promise<Response>)) =>
  jest.fn<Promise<Response>, Parameters<FetchFn>>(() =>
    typeof response === "function" ? response() : Promise.resolve(response),
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

  it("forwards the abort signal to fetch", async () => {
    const fetchStub = createFetchStub(jsonResponse({}));
    const client = createFetchHttpClient({ baseUrl: "https://api.example.com", fetch: fetchStub });
    const controller = new AbortController();

    await client.get("/items", { signal: controller.signal });

    expect(fetchStub.mock.calls[0]?.[1]?.signal).toBe(controller.signal);
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

  it("rejects a successful response whose body is not JSON with an HttpError", async () => {
    const fetchStub = createFetchStub(new Response("<html>", { status: 200 }));
    const client = createFetchHttpClient({ baseUrl: "https://api.example.com", fetch: fetchStub });

    const error = await client.get("/items").catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(HttpError);
    expect((error as HttpError).status).toBe(200);
  });
});
