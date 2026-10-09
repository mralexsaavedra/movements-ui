import { HttpError } from "@/shared/http/HttpError";

import type { ContractViolationReporter } from "../../domain/ContractViolationReporter";
import type { ItemsPageDto } from "../dto/ItemDto";
import { createHttpMovementRepository } from "../repositories/createHttpMovementRepository";
import { itemSchema } from "../schemas/itemSchema";
import { MAX_LIMIT, createMockMovementsHttpClient } from "./createMockMovementsHttpClient";
import { encodeCursor } from "./cursor";

/** The mock returns raw JSON; tests read it through the contract shape. */
const getPage = async (
  client: ReturnType<typeof createMockMovementsHttpClient>,
  query: { cursor?: string; limit?: number | string } = {},
): Promise<ItemsPageDto> => (await client.get("/items", { query })) as ItemsPageDto;

const captureError = (promise: Promise<unknown>): Promise<unknown> =>
  promise.then(
    () => {
      throw new Error("Expected the request to fail");
    },
    (error: unknown) => error,
  );

const silentReporter: ContractViolationReporter = { reportInvalidItem: () => undefined };

/** Success/failure of 20 identical requests against a fresh client with a 50% failure rate. */
const requestOutcomes = async (): Promise<boolean[]> => {
  const client = createMockMovementsHttpClient({
    seed: 3,
    total: 20,
    latencyMs: 0,
    failureRate: 0.5,
  });
  const results: boolean[] = [];
  for (let i = 0; i < 20; i += 1) {
    results.push(
      await getPage(client).then(
        () => true,
        () => false,
      ),
    );
  }
  return results;
};

describe("createMockMovementsHttpClient", () => {
  it("walks every page in order and ends with a null cursor", async () => {
    const client = createMockMovementsHttpClient({ seed: 1, total: 95, latencyMs: 0 });
    const ids: string[] = [];
    let cursor: string | undefined;
    let pages = 0;

    do {
      const page = await getPage(client, { limit: 20, ...(cursor ? { cursor } : {}) });
      ids.push(...page.items.map((item) => item.id));
      cursor = page.nextCursor ?? undefined;
      pages += 1;
    } while (cursor);

    expect(pages).toBe(5);
    expect(ids).toHaveLength(95);
    expect(new Set(ids).size).toBe(95);
    expect(ids).toEqual(ids.toSorted());
  });

  it("serves contract-valid JSON items by default", async () => {
    const client = createMockMovementsHttpClient({ seed: 1, total: 50, latencyMs: 0 });

    const page = await getPage(client, { limit: 50 });

    expect(page.items.every((item) => itemSchema.safeParse(item).success)).toBe(true);
  });

  it("defaults to 20 items per page", async () => {
    const client = createMockMovementsHttpClient({ seed: 1, total: 100, latencyMs: 0 });

    expect((await getPage(client)).items).toHaveLength(20);
  });

  it("accepts the limit as a query-string value", async () => {
    const client = createMockMovementsHttpClient({ seed: 1, total: 100, latencyMs: 0 });

    expect((await getPage(client, { limit: "5" })).items).toHaveLength(5);
  });

  it(`clamps the limit to ${MAX_LIMIT}`, async () => {
    const client = createMockMovementsHttpClient({ seed: 1, total: 500, latencyMs: 0 });

    expect((await getPage(client, { limit: 1000 })).items).toHaveLength(MAX_LIMIT);
  });

  it.each([
    ["zero", 0],
    ["negative", -5],
    ["not an integer", 2.5],
    ["not a number", "abc"],
  ])("rejects a %s limit with a 400", async (_, limit) => {
    const client = createMockMovementsHttpClient({ seed: 1, total: 10, latencyMs: 0 });

    const error = await captureError(getPage(client, { limit }));

    expect(error).toBeInstanceOf(HttpError);
    expect((error as HttpError).status).toBe(400);
  });

  it.each([
    ["garbage", "not-a-cursor"],
    ["past the end", encodeCursor(11)],
  ])("rejects a %s cursor with a 400", async (_, cursor) => {
    const client = createMockMovementsHttpClient({ seed: 1, total: 10, latencyMs: 0 });

    const error = await captureError(getPage(client, { cursor }));

    expect(error).toBeInstanceOf(HttpError);
    expect((error as HttpError).status).toBe(400);
  });

  it("answers 404 for unknown paths", async () => {
    const client = createMockMovementsHttpClient({ seed: 1, total: 10, latencyMs: 0 });

    const error = await captureError(client.get("/accounts"));

    expect((error as HttpError).status).toBe(404);
  });

  it("serves an empty list when the dataset is empty", async () => {
    const client = createMockMovementsHttpClient({ total: 0, latencyMs: 0 });

    expect(await getPage(client)).toEqual({ items: [], nextCursor: null });
  });

  it("returns a fresh copy so callers cannot mutate the dataset", async () => {
    const client = createMockMovementsHttpClient({ seed: 1, total: 5, latencyMs: 0 });
    const first = await getPage(client);
    (first.items as unknown as { id: string }[])[0]!.id = "tampered";

    expect((await getPage(client)).items[0]?.id).not.toBe("tampered");
  });

  describe("error injection", () => {
    it("fails the configured page with a 503 every time", async () => {
      const client = createMockMovementsHttpClient({
        seed: 1,
        total: 100,
        latencyMs: 0,
        failOnPage: 2,
      });
      const first = await getPage(client, { limit: 20 });
      const cursor = first.nextCursor ?? "";

      for (let attempt = 0; attempt < 2; attempt += 1) {
        const error = await captureError(getPage(client, { cursor, limit: 20 }));
        expect(error).toBeInstanceOf(HttpError);
        expect((error as HttpError).status).toBe(503);
      }
    });

    it("fails a deterministic share of requests with failureRate", async () => {
      const first = await requestOutcomes();

      expect(first).toEqual(await requestOutcomes());
      expect(first).toContain(true);
      expect(first).toContain(false);
    });

    it("injects contract-violating items that the repository drops and counts", async () => {
      const httpClient = createMockMovementsHttpClient({
        seed: 1,
        total: 200,
        latencyMs: 0,
        invalidItemRate: 0.2,
      });
      const reportInvalidItem = jest.fn();
      const repository = createHttpMovementRepository({
        httpClient,
        reporter: { reportInvalidItem },
      });

      const page = await repository.getMovements({ limit: 100 });

      expect(page.invalidCount).toBeGreaterThan(0);
      expect(page.items.length + page.invalidCount).toBe(100);
      expect(reportInvalidItem).toHaveBeenCalledTimes(page.invalidCount);
    });

    it("keeps every item valid end to end when invalidItemRate is 0", async () => {
      const httpClient = createMockMovementsHttpClient({ seed: 1, total: 300, latencyMs: 0 });
      const repository = createHttpMovementRepository({ httpClient, reporter: silentReporter });

      const page = await repository.getMovements({ limit: 100 });

      expect(page.invalidCount).toBe(0);
      expect(page.items).toHaveLength(100);
    });
  });

  describe("latency and cancellation", () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it("resolves only after the configured latency", async () => {
      const client = createMockMovementsHttpClient({ seed: 1, total: 10, latencyMs: 400 });
      const onResolve = jest.fn();

      const request = client.get("/items").then(onResolve);
      await jest.advanceTimersByTimeAsync(399);
      expect(onResolve).not.toHaveBeenCalled();

      await jest.advanceTimersByTimeAsync(1);
      await request;
      expect(onResolve).toHaveBeenCalledTimes(1);
    });

    it("rejects with an AbortError when the signal aborts during the latency", async () => {
      const client = createMockMovementsHttpClient({ seed: 1, total: 10, latencyMs: 400 });
      const controller = new AbortController();

      const request = captureError(client.get("/items", { signal: controller.signal }));
      await jest.advanceTimersByTimeAsync(100);
      controller.abort();
      const error = await request;

      expect(error).toBeInstanceOf(Error);
      expect((error as Error).name).toBe("AbortError");
      expect(jest.getTimerCount()).toBe(0);
    });

    it("rejects immediately when the signal is already aborted", async () => {
      const client = createMockMovementsHttpClient({ seed: 1, total: 10, latencyMs: 0 });
      const controller = new AbortController();
      controller.abort();

      const error = await captureError(client.get("/items", { signal: controller.signal }));

      expect((error as Error).name).toBe("AbortError");
    });
  });
});
