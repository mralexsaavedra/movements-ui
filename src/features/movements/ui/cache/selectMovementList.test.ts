import type { InfiniteData } from "@tanstack/react-query";

import type { MovementSnapshot, MovementsPageSnapshot } from "./movementsPageSnapshot";
import { selectMovementList } from "./selectMovementList";

const snapshot = (id: string): MovementSnapshot => ({
  id,
  direction: "outbound",
  status: "confirmed",
  amount: { value: 10, currency: "EUR" },
  counterparty: { name: "Lumen Coffee Roasters", imageUrl: null },
  category: "Food & drink",
  date: "2026-10-07T09:15:00.000Z",
  flagged: false,
});

const page = (ids: readonly string[], invalidCount = 0): MovementsPageSnapshot => ({
  items: ids.map(snapshot),
  nextCursor: null,
  invalidCount,
});

const data = (
  ...pages: MovementsPageSnapshot[]
): InfiniteData<MovementsPageSnapshot, string | undefined> => ({
  pages,
  pageParams: pages.map((_, index) => (index === 0 ? undefined : `cursor-${index}`)),
});

describe("selectMovementList", () => {
  it("flattens pages in order and revives dates", () => {
    const list = selectMovementList(data(page(["a", "b"]), page(["c"])));

    expect(list.items.map((item) => item.id)).toEqual(["a", "b", "c"]);
    expect(list.items[0]?.date).toBeInstanceOf(Date);
    expect(list.items[0]?.date.toISOString()).toBe("2026-10-07T09:15:00.000Z");
  });

  it("keeps the first occurrence of an id repeated across pages", () => {
    const first = page(["a", "b"]);
    const list = selectMovementList(data(first, page(["b", "c"]), page(["a", "d"])));

    expect(list.items.map((item) => item.id)).toEqual(["a", "b", "c", "d"]);
    expect(list.items[1]?.amount).toBe(first.items[1]?.amount);
  });

  it("sums the dropped items of every loaded page", () => {
    const list = selectMovementList(data(page(["a"], 2), page(["b"], 0), page(["c"], 3)));

    expect(list.invalidCount).toBe(5);
  });

  it("returns the same movement objects for unchanged rows", () => {
    const first = page(["a", "b"]);

    const before = selectMovementList(data(first));
    const after = selectMovementList(data(first, page(["c"])));

    expect(after.items[0]).toBe(before.items[0]);
    expect(after.items[1]).toBe(before.items[1]);
  });
});
