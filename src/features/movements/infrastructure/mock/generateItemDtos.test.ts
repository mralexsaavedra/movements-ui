import { itemSchema } from "../schemas/itemSchema";
import { generateItemDtos } from "./generateItemDtos";

describe("generateItemDtos", () => {
  it("is deterministic: the same seed produces the same items", () => {
    expect(generateItemDtos({ seed: 7, total: 200 })).toEqual(
      generateItemDtos({ seed: 7, total: 200 }),
    );
  });

  it("produces a different dataset for a different seed", () => {
    expect(generateItemDtos({ seed: 7, total: 200 })).not.toEqual(
      generateItemDtos({ seed: 8, total: 200 }),
    );
  });

  it("generates the requested number of items with unique ids", () => {
    const items = generateItemDtos({ seed: 42, total: 5000 });

    expect(items).toHaveLength(5000);
    expect(new Set(items.map((item) => item.id)).size).toBe(5000);
  });

  it("generates only contract-valid items", () => {
    const items = generateItemDtos({ seed: 42, total: 5000 });

    const invalid = items.filter((item) => !itemSchema.safeParse(item).success);

    expect(invalid).toEqual([]);
  });

  it("sorts items by date, newest first", () => {
    const times = generateItemDtos({ seed: 42, total: 1000 }).map((item) => Date.parse(item.date));

    const outOfOrder = times.filter((time, index) => index > 0 && time > (times[index - 1] ?? 0));

    expect(outOfOrder).toEqual([]);
  });

  it("covers every visual state the list must render", () => {
    const items = generateItemDtos({ seed: 42, total: 5000 });
    const longestName = Math.max(...items.map((item) => item.label.name.length));

    expect(items.some((item) => item.type === "inbound")).toBe(true);
    expect(items.some((item) => item.type === "outbound")).toBe(true);
    expect(items.some((item) => item.status === "pending")).toBe(true);
    expect(items.some((item) => item.status === "confirmed")).toBe(true);
    expect(items.some((item) => item.flagged)).toBe(true);
    expect(items.some((item) => item.label.imageUrl === null)).toBe(true);
    expect(items.some((item) => item.label.imageUrl !== null)).toBe(true);
    expect(longestName).toBeGreaterThan(40);
    expect(new Set(items.map((item) => item.amount.currency)).size).toBeGreaterThan(2);
  });

  it("keeps EUR as the dominant currency and flags a small share", () => {
    const items = generateItemDtos({ seed: 42, total: 5000 });
    const share = (predicate: (item: (typeof items)[number]) => boolean) =>
      items.filter(predicate).length / items.length;

    expect(share((item) => item.amount.currency === "EUR")).toBeGreaterThan(0.7);
    expect(share((item) => item.flagged)).toBeGreaterThan(0.02);
    expect(share((item) => item.flagged)).toBeLessThan(0.1);
  });

  it("returns an empty dataset when total is 0", () => {
    expect(generateItemDtos({ seed: 42, total: 0 })).toEqual([]);
  });
});
