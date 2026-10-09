import type { HttpClient, QueryParamValue } from "@/shared/http/HttpClient";
import { HttpError } from "@/shared/http/HttpError";

import { ITEMS_PATH } from "../repositories/createHttpMovementRepository";
import { corruptItems } from "./corruptItems";
import { decodeCursor, encodeCursor } from "./cursor";
import { generateItemDtos } from "./generateItemDtos";
import { chance, createRandom } from "./random";

export const DEFAULT_SEED = 42;
export const DEFAULT_TOTAL = 5000;
export const DEFAULT_LATENCY_MS = 400;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

export interface MockMovementsHttpClientOptions {
  /** Same seed => same dataset, same failures. */
  readonly seed?: number;
  /** Dataset size; `0` serves an empty list. */
  readonly total?: number;
  /** Simulated network latency per request. Use `0` in tests. */
  readonly latencyMs?: number;
  /** Share (0..1) of requests that fail with a 503, drawn from the seeded stream. */
  readonly failureRate?: number;
  /** 1-based page (offset / limit + 1) that always fails with a 503, to show error states. */
  readonly failOnPage?: number;
  /** Share (0..1) of items replaced by contract-violating ones, to exercise the drop policy. */
  readonly invalidItemRate?: number;
  /** Date of the newest movement (ISO 8601). */
  readonly anchorDate?: string;
}

const createAbortError = (): Error => {
  const error = new Error("The request was aborted");
  error.name = "AbortError";
  return error;
};

const wait = (ms: number, signal: AbortSignal | undefined): Promise<void> =>
  new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(createAbortError());
      return;
    }
    if (ms <= 0) {
      resolve();
      return;
    }
    const onAbort = () => {
      clearTimeout(timer);
      reject(createAbortError());
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal?.addEventListener("abort", onAbort, { once: true });
  });

const parseLimit = (raw: QueryParamValue): number => {
  if (raw === undefined) return DEFAULT_LIMIT;
  const limit = Number(raw);
  if (!Number.isInteger(limit) || limit < 1) {
    throw new HttpError(400, "limit must be a positive integer");
  }
  return Math.min(limit, MAX_LIMIT);
};

const parseOffset = (raw: QueryParamValue, total: number): number => {
  if (raw === undefined) return 0;
  const offset = decodeCursor(String(raw));
  if (offset === null || offset > total) throw new HttpError(400, "Invalid cursor");
  return offset;
};

/**
 * In-process fake backend for `GET /items`, plugged in at the transport boundary: it returns
 * raw JSON, so the real repository, Zod validation and mapping run exactly as with `fetch`.
 */
export const createMockMovementsHttpClient = ({
  seed = DEFAULT_SEED,
  total = DEFAULT_TOTAL,
  latencyMs = DEFAULT_LATENCY_MS,
  failureRate = 0,
  failOnPage,
  invalidItemRate = 0,
  anchorDate,
}: MockMovementsHttpClientOptions = {}): HttpClient => {
  const dataset = corruptItems(
    generateItemDtos({ seed, total, ...(anchorDate ? { anchorDate } : {}) }),
    { seed, rate: invalidItemRate },
  );
  // One draw per request, from its own stream: failures are reproducible for a given seed.
  const failureRandom = createRandom(seed + 1);

  return {
    get: async (path, { query = {}, signal } = {}) => {
      await wait(latencyMs, signal);
      const failsRandomly = chance(failureRandom, failureRate);

      if (path !== ITEMS_PATH) throw new HttpError(404, `Unknown path ${path}`);
      const limit = parseLimit(query.limit);
      const offset = parseOffset(query.cursor, dataset.length);
      const page = Math.floor(offset / limit) + 1;
      if (page === failOnPage || failsRandomly) {
        throw new HttpError(503, "Service unavailable (injected)");
      }

      const end = offset + limit;
      const body = {
        items: dataset.slice(offset, end),
        nextCursor: end < dataset.length ? encodeCursor(end) : null,
      };
      // Serialise like the wire would: callers get plain JSON they cannot use to mutate the dataset.
      return JSON.parse(JSON.stringify(body)) as unknown;
    },
  };
};
