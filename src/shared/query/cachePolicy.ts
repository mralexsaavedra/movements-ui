/**
 * Cache policy for server state, in one place so the trade-offs are reviewable together.
 */

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;

/**
 * Data younger than this is served from cache without refetching. Balances and movements change
 * rarely within a session, so 30 s avoids refetch churn on remounts and focus changes while
 * keeping what the user sees close to the server.
 */
export const STALE_TIME_MS = 30_000;

/** How long the persisted cache stays usable across launches; older caches are discarded. */
export const PERSIST_MAX_AGE_MS = 24 * HOUR_MS;

/**
 * How long an unused query stays in memory. It must be at least `PERSIST_MAX_AGE_MS`: a query
 * garbage-collected earlier would also be dropped from the persisted cache.
 */
export const GC_TIME_MS = PERSIST_MAX_AGE_MS;

/** Retries after the first attempt, for transient failures only (see `shouldRetry`). */
export const MAX_QUERY_RETRIES = 2;

/**
 * Pages of an infinite query written to disk. One page (20 rows) is enough to paint the list
 * instantly on the next launch; deeper pages are refetched on scroll. Writing thousands of rows
 * would slow every save, approach AsyncStorage's per-entry limits on Android, and keep more
 * financial data at rest than the first paint needs.
 */
export const MAX_PERSISTED_PAGES = 1;

/** Storage key of the persisted query cache. */
export const PERSISTED_CACHE_KEY = "movements-ui.query-cache";
