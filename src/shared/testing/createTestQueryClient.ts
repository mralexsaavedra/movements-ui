import { QueryClient } from "@tanstack/react-query";

/**
 * Fresh client per test: no retries (failures surface at once) and no garbage-collection timers
 * (`gcTime: Infinity`), which would otherwise keep Jest alive after the run.
 */
export const createTestQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
