import { createMovementRepository, readApiConfig } from "./dependencies";

describe("readApiConfig", () => {
  it("defaults to the mock backend", () => {
    expect(readApiConfig({})).toEqual({ mode: "mock" });
  });

  it.each([
    ["empty", ""],
    ["whitespace", "   "],
  ])("treats an %s mode as the mock default", (_, mode) => {
    expect(readApiConfig({ EXPO_PUBLIC_API_MODE: mode })).toEqual({ mode: "mock" });
  });

  it("trims the mode and the base URL", () => {
    expect(
      readApiConfig({
        EXPO_PUBLIC_API_MODE: " http ",
        EXPO_PUBLIC_API_BASE_URL: " https://api.example.com ",
      }),
    ).toEqual({ mode: "http", baseUrl: "https://api.example.com" });
  });

  it("fails fast when HTTP mode has a blank base URL", () => {
    expect(() =>
      readApiConfig({ EXPO_PUBLIC_API_MODE: "http", EXPO_PUBLIC_API_BASE_URL: "  " }),
    ).toThrow(/EXPO_PUBLIC_API_BASE_URL/);
  });

  it("selects HTTP with a base URL", () => {
    expect(
      readApiConfig({
        EXPO_PUBLIC_API_MODE: "http",
        EXPO_PUBLIC_API_BASE_URL: "https://api.example.com",
      }),
    ).toEqual({ mode: "http", baseUrl: "https://api.example.com" });
  });

  it("fails fast when HTTP mode has no base URL", () => {
    expect(() => readApiConfig({ EXPO_PUBLIC_API_MODE: "http" })).toThrow(
      /EXPO_PUBLIC_API_BASE_URL/,
    );
  });

  it("fails fast on an unknown mode", () => {
    expect(() => readApiConfig({ EXPO_PUBLIC_API_MODE: "staging" })).toThrow(
      /EXPO_PUBLIC_API_MODE/,
    );
  });
});

describe("createMovementRepository", () => {
  it("serves validated movements from the mock backend", async () => {
    const repository = createMovementRepository({ mode: "mock", mock: { latencyMs: 0 } });

    const page = await repository.getMovements({ limit: 20 });

    expect(page.items).toHaveLength(20);
    expect(page.items[0]?.date).toBeInstanceOf(Date);
    expect(page.nextCursor).not.toBeNull();
  });

  it("requests GET /items over fetch in HTTP mode", async () => {
    const originalFetch = globalThis.fetch;
    const fetchStub = jest.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify({ items: [], nextCursor: null }), { status: 200 }),
      ),
    );
    globalThis.fetch = fetchStub as unknown as typeof fetch;
    try {
      const repository = createMovementRepository({
        mode: "http",
        baseUrl: "https://api.example.com",
      });

      const page = await repository.getMovements({ limit: 20 });

      expect(page).toEqual({ items: [], nextCursor: null, invalidCount: 0 });
      expect(fetchStub).toHaveBeenCalledTimes(1);
      expect(fetchStub.mock.calls[0]).toEqual([
        "https://api.example.com/items?limit=20",
        expect.objectContaining({ method: "GET" }),
      ]);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
