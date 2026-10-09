import { createMovementRepository, readApiConfig } from "./dependencies";

describe("readApiConfig", () => {
  it("defaults to the mock backend", () => {
    expect(readApiConfig({})).toEqual({ mode: "mock" });
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
});
