import { z } from "zod";

import type { MovementSnapshot, MovementsPageSnapshot } from "./movementsPageSnapshot";

/**
 * Runtime mirror of `MovementSnapshot`, the domain-shaped page the query cache stores. It guards
 * data read back from disk only: network pages are already validated by the contract schema in
 * infrastructure before they become snapshots, so they never pay for this check.
 */
const movementSnapshotSchema = z.object({
  id: z.string().min(1),
  direction: z.enum(["inbound", "outbound"]),
  status: z.enum(["pending", "confirmed"]),
  amount: z.object({
    value: z.number().nonnegative(),
    currency: z.string().regex(/^[A-Z]{3}$/),
  }),
  counterparty: z.object({
    name: z.string().min(1),
    imageUrl: z.httpUrl().nullable(),
  }),
  category: z.string(),
  // `toPageSnapshot` writes `toISOString()`, so anything else means the stored copy is corrupt.
  date: z.iso.datetime({ offset: true }),
  flagged: z.boolean(),
});

const movementsPageSnapshotSchema = z.object({
  items: z.array(movementSnapshotSchema).readonly(),
  nextCursor: z.string().nullable(),
  invalidCount: z.number().int().nonnegative(),
});

/** The infinite query data as restored from JSON (an `undefined` page param comes back `null`). */
export const movementsInfiniteSnapshotSchema = z.object({
  pages: z.array(movementsPageSnapshotSchema),
  pageParams: z.array(z.string().nullish()),
});

// Drift guard: compilation fails if the schema and the snapshot types diverge.
type MutuallyAssignable<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type AssertTrue<T extends true> = T;
export type MovementSnapshotSchemaMatchesType = AssertTrue<
  MutuallyAssignable<z.infer<typeof movementSnapshotSchema>, MovementSnapshot>
>;
export type MovementsPageSnapshotSchemaMatchesType = AssertTrue<
  MutuallyAssignable<z.infer<typeof movementsPageSnapshotSchema>, MovementsPageSnapshot>
>;
