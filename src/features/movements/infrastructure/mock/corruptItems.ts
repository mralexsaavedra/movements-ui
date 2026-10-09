import type { ItemDto } from "../dto/ItemDto";
import { chance, createRandom, pickWeighted } from "./random";

type Corruption = (item: ItemDto) => Record<string, unknown>;

/** Realistic contract violations; each one is rejected by `itemSchema` (see the test). */
export const CORRUPTIONS: readonly (readonly [Corruption, number])[] = [
  [(item) => ({ ...item, amount: { ...item.amount, value: -item.amount.value - 1 } }), 1],
  [(item) => ({ ...item, amount: { ...item.amount, currency: "euro" } }), 1],
  [(item) => ({ ...item, label: { ...item.label, name: "" } }), 1],
  [(item) => ({ ...item, date: item.date.replace(/(Z|[+-]\d{2}:\d{2})$/, "") }), 1],
  [(item) => ({ ...item, type: "refund" }), 1],
];

/** Separate stream so turning corruption on does not change the valid dataset itself. */
const CORRUPTION_SEED_SALT = 0x9e3779b9;

/**
 * Replaces a deterministic share of items with contract-violating ones (same id, so drops can
 * be traced). Used to exercise the drop-and-count policy end to end.
 */
export const corruptItems = (
  items: readonly ItemDto[],
  { seed, rate }: { readonly seed: number; readonly rate: number },
): unknown[] => {
  if (rate <= 0) return [...items];
  const random = createRandom(seed ^ CORRUPTION_SEED_SALT);
  return items.map((item) =>
    chance(random, rate) ? pickWeighted(random, CORRUPTIONS)(item) : item,
  );
};
