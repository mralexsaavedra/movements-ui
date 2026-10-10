import type { InfiniteData } from "@tanstack/react-query";
import {
  persistQueryClientRestore,
  persistQueryClientSave,
} from "@tanstack/react-query-persist-client";

import { createQueryPersistOptions } from "@/shared/query/createQueryPersistOptions";
import { createMemoryStorage } from "@/shared/testing/createMemoryStorage";
import { createTestQueryClient } from "@/shared/testing/createTestQueryClient";

import { isRestorableMovementsQuery } from "./isRestorableMovementsQuery";
import { isMovementsQueryKey, movementsKeys } from "./movementsKeys";
import type { MovementSnapshot, MovementsPageSnapshot } from "./movementsPageSnapshot";
import { selectMovementList } from "./selectMovementList";

type Data = InfiniteData<MovementsPageSnapshot, string | undefined>;

const listKey = movementsKeys.list({ limit: 20 });

const snapshot = (id: string): MovementSnapshot => ({
  id,
  direction: "inbound",
  status: "pending",
  amount: { value: 42.5, currency: "EUR" },
  counterparty: { name: "Northwind Books", imageUrl: "https://example.com/logo.png" },
  category: "Shopping",
  date: "2026-10-07T09:15:00.000Z",
  flagged: false,
});

const validData = (): Data => ({
  pages: [{ items: [snapshot("a"), snapshot("b")], nextCursor: "cursor-2", invalidCount: 1 }],
  pageParams: [undefined],
});

/** Replaces the first item of the first page with arbitrary (possibly corrupt) JSON. */
const withFirstItem = (item: unknown): unknown => ({
  pages: [{ items: [item], nextCursor: null, invalidCount: 0 }],
  pageParams: [null],
});

const { date: _date, ...withoutDate } = snapshot("a");

const corruptions: readonly (readonly [string, unknown])[] = [
  ["not infinite data", { items: [] }],
  ["pages not an array", { pages: "nope", pageParams: [] }],
  ["page missing nextCursor", { pages: [{ items: [], invalidCount: 0 }], pageParams: [null] }],
  [
    "invalidCount as a string",
    { pages: [{ items: [], nextCursor: null, invalidCount: "0" }], pageParams: [null] },
  ],
  ["invalid date", withFirstItem({ ...snapshot("a"), date: "not-a-date" })],
  ["missing date", withFirstItem(withoutDate)],
  ["amount as a string", withFirstItem({ ...snapshot("a"), amount: "10 EUR" })],
  ["unknown direction", withFirstItem({ ...snapshot("a"), direction: "sideways" })],
  ["null data", null],
];

describe("isRestorableMovementsQuery", () => {
  it("accepts a valid snapshot restored from JSON", () => {
    const restored: unknown = JSON.parse(JSON.stringify(validData()));

    expect(isRestorableMovementsQuery(listKey, restored)).toBe(true);
  });

  it.each(corruptions)("rejects a snapshot with %s", (_, data) => {
    expect(isRestorableMovementsQuery(listKey, data)).toBe(false);
  });

  it("leaves queries outside the movements keys alone", () => {
    expect(isRestorableMovementsQuery(["profile"], "anything")).toBe(true);
  });
});

const roundTrip = async (data: unknown) => {
  const options = createQueryPersistOptions({
    storage: createMemoryStorage(),
    buster: "test",
    shouldPersistQuery: (query) => isMovementsQueryKey(query.queryKey),
    isRestorableQuery: isRestorableMovementsQuery,
  });
  const source = createTestQueryClient();
  source.setQueryData(listKey, data);
  source.setQueryData([...movementsKeys.all, "other"], validData());
  await persistQueryClientSave({ queryClient: source, ...options });

  const queryClient = createTestQueryClient();
  await persistQueryClientRestore({ queryClient, ...options });
  return queryClient;
};

describe("restoring the persisted movements cache", () => {
  it("restores a valid snapshot that select revives into movements", async () => {
    const queryClient = await roundTrip(validData());

    const restored = queryClient.getQueryData<Data>(listKey);
    expect(restored).toBeDefined();
    const list = selectMovementList(restored as Data);
    expect(list.items.map((item) => item.id)).toEqual(["a", "b"]);
    expect(list.items[0]?.date).toBeInstanceOf(Date);
    expect(list.invalidCount).toBe(1);
  });

  it.each(corruptions.filter(([, data]) => data !== null))(
    "drops a snapshot with %s so the list fetches fresh data",
    async (_, data) => {
      const queryClient = await roundTrip(data);

      // No cached state at all: the next observer starts from `pending` and fetches.
      expect(queryClient.getQueryState(listKey)).toBeUndefined();
      expect(queryClient.getQueryData([...movementsKeys.all, "other"])).toEqual(
        JSON.parse(JSON.stringify(validData())),
      );
    },
  );
});
