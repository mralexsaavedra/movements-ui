import { act, renderHook, waitFor } from "@testing-library/react-native";

import type { HttpClient } from "@/shared/http/HttpClient";

import { createMockMovementsHttpClient } from "../../infrastructure/mock/createMockMovementsHttpClient";
import { encodeCursor } from "../../infrastructure/mock/cursor";
import { createMovementsWrapper } from "../../testing/createMovementsWrapper";
import { MOVEMENTS_PAGE_SIZE, useMovementsInfiniteQuery } from "./useMovementsInfiniteQuery";

/** Moves every `nextCursor` one item back, so consecutive pages share one movement. */
const createOverlappingHttpClient = (): HttpClient => {
  const inner = createMockMovementsHttpClient({ latencyMs: 0, total: 50 });
  let offset = 0;
  return {
    get: async (path, options) => {
      const body = (await inner.get(path, options)) as { items: unknown[]; nextCursor: unknown };
      offset += body.items.length - 1;
      return { ...body, nextCursor: body.nextCursor === null ? null : encodeCursor(offset) };
    },
  };
};

describe("useMovementsInfiniteQuery", () => {
  it("loads the first page through the repository", async () => {
    const { Wrapper } = createMovementsWrapper({ mock: { total: 45 } });

    const { result } = await renderHook(() => useMovementsInfiniteQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.data?.items).toHaveLength(MOVEMENTS_PAGE_SIZE));
    expect(result.current.data?.items[0]?.date).toBeInstanceOf(Date);
    expect(result.current.hasNextPage).toBe(true);
  });

  it("follows the next cursor until the end of the list", async () => {
    const { Wrapper } = createMovementsWrapper({ mock: { total: 45 } });
    const { result } = await renderHook(() => useMovementsInfiniteQuery(), { wrapper: Wrapper });
    // Reading `data` subscribes the test to it (React Query only re-renders for tracked props).
    await waitFor(() => expect(result.current.data?.items.length).toBeGreaterThan(0));

    await act(async () => {
      await result.current.fetchNextPage();
    });
    await waitFor(() => expect(result.current.data?.items).toHaveLength(40));
    await act(async () => {
      await result.current.fetchNextPage();
    });
    await waitFor(() => expect(result.current.data?.items).toHaveLength(45));
    expect(new Set(result.current.data?.items.map((item) => item.id)).size).toBe(45);
    expect(result.current.hasNextPage).toBe(false);
  });

  it("shows a movement repeated by overlapping pages only once", async () => {
    const { Wrapper } = createMovementsWrapper({ httpClient: createOverlappingHttpClient() });
    const { result } = await renderHook(() => useMovementsInfiniteQuery(), { wrapper: Wrapper });
    // Reading `data` subscribes the test to it (React Query only re-renders for tracked props).
    await waitFor(() => expect(result.current.data?.items.length).toBeGreaterThan(0));

    await act(async () => {
      await result.current.fetchNextPage();
    });

    await waitFor(() =>
      expect(result.current.data?.items).toHaveLength(2 * MOVEMENTS_PAGE_SIZE - 1),
    );
    const ids = result.current.data?.items.map((item) => item.id) ?? [];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("sums dropped invalid items across loaded pages", async () => {
    const { Wrapper, reporter } = createMovementsWrapper({
      mock: { total: 60, invalidItemRate: 0.2 },
    });
    const { result } = await renderHook(() => useMovementsInfiniteQuery(), { wrapper: Wrapper });
    // Reading `data` subscribes the test to it (React Query only re-renders for tracked props).
    await waitFor(() => expect(result.current.data?.items.length).toBeGreaterThan(0));
    const firstPageInvalid = result.current.data?.invalidCount ?? 0;
    const firstPageItems = result.current.data?.items.length ?? 0;

    await act(async () => {
      await result.current.fetchNextPage();
    });
    await waitFor(() => expect(result.current.data?.items.length).toBeGreaterThan(firstPageItems));

    const invalidCount = result.current.data?.invalidCount ?? 0;
    expect(invalidCount).toBeGreaterThan(firstPageInvalid);
    expect(invalidCount).toBe(reporter.reportInvalidItem.mock.calls.length);
    expect(result.current.data?.items).toHaveLength(2 * MOVEMENTS_PAGE_SIZE - invalidCount);
  });
});
