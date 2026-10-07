import { z } from "zod";

import type { ItemDto } from "../dto/ItemDto";

/**
 * Runtime mirror of `Item` in `contract/openapi.yaml`.
 *
 * Some rules are stricter than the spec on purpose: they reject values the UI could not
 * render truthfully. A rejected item is dropped and reported, never shown wrong.
 */
export const itemSchema = z.object({
  // An empty id cannot be used as a list key nor traced back to the backend.
  id: z.string().min(1),
  type: z.enum(["inbound", "outbound"]),
  status: z.enum(["pending", "confirmed"]),
  amount: z.object({
    // The direction (`type`) carries the sign, so a negative value would be ambiguous
    // (double negative). Zod 4 `z.number()` already rejects Infinity and NaN.
    value: z.number().nonnegative(),
    // `Intl.NumberFormat` needs an ISO 4217 code; anything else throws a RangeError at render.
    currency: z.string().regex(/^[A-Z]{3}$/),
  }),
  label: z.object({
    // A movement without a counterparty name has nothing meaningful to show or announce.
    name: z.string().min(1),
    // Only web images can be loaded; blocks `javascript:`, `file:` and similar schemes.
    imageUrl: z.httpUrl().nullable(),
  }),
  category: z.string(),
  // A timezone (Z or ±hh:mm) is required: without it the device timezone would shift the day.
  date: z.iso.datetime({ offset: true }),
  flagged: z.boolean(),
});

/**
 * Envelope only: items are validated one by one so a single bad item does not fail the page.
 */
export const itemsPageEnvelopeSchema = z.object({
  items: z.array(z.unknown()),
  nextCursor: z.string().nullable(),
});

// Drift guard: compilation fails if the schema and the hand-written DTO diverge in either
// direction (missing, extra, optional or differently typed fields).
type MutuallyAssignable<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
export type ItemSchemaMatchesDto = AssertTrue<
  MutuallyAssignable<z.infer<typeof itemSchema>, ItemDto>
>;
type AssertTrue<T extends true> = T;
