import type { HttpClient } from "@/shared/http/HttpClient";
import { HttpError } from "@/shared/http/HttpError";

import {
  type MockMovementsHttpClientOptions,
  createMockMovementsHttpClient,
} from "../infrastructure/mock/createMockMovementsHttpClient";

/**
 * The seeded mock transport plus test switches: fail every request with a 503, or hold requests
 * until released (to observe in-flight states). Counts requests to prove no-ops.
 */
export const createControllableHttpClient = (options: MockMovementsHttpClientOptions = {}) => {
  const inner = createMockMovementsHttpClient({ latencyMs: 0, ...options });
  let failing = false;
  let gate: Promise<void> | null = null;
  let requests = 0;

  const httpClient: HttpClient = {
    get: async (path, requestOptions) => {
      requests += 1;
      if (gate) await gate;
      if (failing) throw new HttpError(503, "Service unavailable (test)");
      return inner.get(path, requestOptions);
    },
  };

  return {
    httpClient,
    setFailing: (value: boolean) => {
      failing = value;
    },
    /** Holds every request until the returned function is called. */
    hold: () => {
      let open: (() => void) | undefined;
      gate = new Promise<void>((resolve) => {
        open = resolve;
      });
      return () => {
        gate = null;
        open?.();
      };
    },
    requestCount: () => requests,
  };
};
