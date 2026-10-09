import { onlineManager } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react-native";

import type { HttpClient } from "@/shared/http/HttpClient";
import { HttpError } from "@/shared/http/HttpError";

import { createControllableHttpClient } from "../../testing/createControllableHttpClient";
import { createMovementsWrapper } from "../../testing/createMovementsWrapper";
import { MAX_AUTO_FETCHED_PAGES, useMovementList } from "./useMovementList";

/** Replaces every item of the first page with an empty (contract-violating) object. */
const withInvalidFirstPage = (inner: HttpClient): HttpClient => ({
  get: async (path, options) => {
    const body = (await inner.get(path, options)) as { items: unknown[]; nextCursor: unknown };
    return options?.query?.cursor === undefined
      ? { ...body, items: body.items.map(() => ({})) }
      : body;
  },
});

const setup = async (
  options: Parameters<typeof createControllableHttpClient>[0] = {},
  {
    failing = false,
    wrapTransport = (client: HttpClient) => client,
  }: { failing?: boolean; wrapTransport?: (client: HttpClient) => HttpClient } = {},
) => {
  const transport = createControllableHttpClient(options);
  transport.setFailing(failing);
  const { Wrapper } = createMovementsWrapper({ httpClient: wrapTransport(transport.httpClient) });
  const hook = await renderHook(() => useMovementList(), { wrapper: Wrapper });
  return { ...hook, transport };
};

describe("useMovementList", () => {
  afterEach(async () => {
    jest.restoreAllMocks();
    // Hooks are still mounted here (cleanup runs later), so the update goes through act.
    await act(async () => {
      onlineManager.setOnline(true);
    });
  });

  it("starts loading, then shows the first page", async () => {
    const transport = createControllableHttpClient({ total: 45 });
    const release = transport.hold();
    const { Wrapper } = createMovementsWrapper({ httpClient: transport.httpClient });
    const { result } = await renderHook(() => useMovementList(), { wrapper: Wrapper });

    expect(result.current.status).toBe("loading");
    release();
    await waitFor(() => expect(result.current.status).toBe("success"));
    expect(result.current.items).toHaveLength(20);
    expect(result.current.hasNextPage).toBe(true);
  });

  it("appends pages on loadMore and becomes a no-op at the end of the list", async () => {
    const { result, transport } = await setup({ total: 45 });
    await waitFor(() => expect(result.current.items).toHaveLength(20));

    await act(async () => result.current.loadMore());
    await waitFor(() => expect(result.current.items).toHaveLength(40));
    await act(async () => result.current.loadMore());
    await waitFor(() => expect(result.current.items).toHaveLength(45));
    expect(result.current.hasNextPage).toBe(false);

    const requests = transport.requestCount();
    await act(async () => result.current.loadMore());
    expect(transport.requestCount()).toBe(requests);
  });

  it("ignores loadMore while a page is already being fetched", async () => {
    const { result, transport } = await setup({ total: 45 });
    await waitFor(() => expect(result.current.items).toHaveLength(20));
    const release = transport.hold();

    await act(async () => result.current.loadMore());
    await waitFor(() => expect(result.current.isFetchingNextPage).toBe(true));
    await act(async () => result.current.loadMore());
    release();

    await waitFor(() => expect(result.current.items).toHaveLength(40));
    expect(transport.requestCount()).toBe(2);
  });

  it("reports an empty list", async () => {
    const { result } = await setup({ total: 0 });

    await waitFor(() => expect(result.current.status).toBe("empty"));
    expect(result.current.items).toHaveLength(0);
  });

  it("reports an error with no data and recovers on retry", async () => {
    const { result, transport } = await setup({ total: 45 }, { failing: true });
    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.error).toBeInstanceOf(HttpError);

    transport.setFailing(false);
    const release = transport.hold();
    await act(async () => result.current.retry());
    await waitFor(() => expect(result.current.status).toBe("loading"));
    release();

    await waitFor(() => expect(result.current.status).toBe("success"));
    expect(result.current.items).toHaveLength(20);
    expect(result.current.error).toBeNull();
  });

  it("keeps showing loaded rows when the next page fails, and retries that page", async () => {
    const { result, transport } = await setup({ total: 45, failOnPage: 2 });
    await waitFor(() => expect(result.current.items).toHaveLength(20));

    await act(async () => result.current.loadMore());
    await waitFor(() => expect(result.current.error).toBeInstanceOf(HttpError));
    expect(result.current.status).toBe("success");
    expect(result.current.items).toHaveLength(20);

    // A failed page is retried explicitly, not by scrolling to the end again.
    const requests = transport.requestCount();
    await act(async () => result.current.loadMore());
    expect(transport.requestCount()).toBe(requests);

    await act(async () => result.current.retry());
    await waitFor(() => expect(transport.requestCount()).toBe(requests + 1));
  });

  it("refreshes the first page while keeping every loaded row visible", async () => {
    const { result, transport } = await setup({ total: 45 });
    await waitFor(() => expect(result.current.items).toHaveLength(20));
    await act(async () => result.current.loadMore());
    await waitFor(() => expect(result.current.items).toHaveLength(40));
    const release = transport.hold();
    const requests = transport.requestCount();

    await act(async () => {
      void result.current.refresh();
    });

    await waitFor(() => expect(result.current.isRefreshing).toBe(true));
    expect(result.current.status).toBe("success");
    expect(result.current.items).toHaveLength(40);

    release();
    await waitFor(() => expect(result.current.isRefreshing).toBe(false));
    expect(result.current.items).toHaveLength(20);
    expect(result.current.hasNextPage).toBe(true);
    expect(transport.requestCount()).toBe(requests + 1);
  });

  it("keeps every loaded page and exposes the error when a refresh fails", async () => {
    // Same-millisecond timestamps (common with a zero-latency transport): the failure must still
    // count as newer than the data it failed to replace.
    jest.spyOn(Date, "now").mockReturnValue(1_760_000_000_000);
    const { result, transport } = await setup({ total: 45 });
    await waitFor(() => expect(result.current.items).toHaveLength(20));
    await act(async () => result.current.loadMore());
    await waitFor(() => expect(result.current.items).toHaveLength(40));
    transport.setFailing(true);

    await act(async () => result.current.refresh());

    expect(result.current.isRefreshing).toBe(false);
    expect(result.current.items).toHaveLength(40);
    expect(result.current.status).toBe("success");
    expect(result.current.error).toBeInstanceOf(HttpError);
  });

  it("does not hang a refresh while offline", async () => {
    const { result, transport } = await setup({ total: 45 });
    await waitFor(() => expect(result.current.items).toHaveLength(20));
    const requests = transport.requestCount();

    await act(async () => {
      onlineManager.setOnline(false);
    });
    expect(result.current.isOffline).toBe(true);
    await act(async () => result.current.refresh());

    expect(result.current.isRefreshing).toBe(false);
    expect(result.current.items).toHaveLength(20);
    expect(transport.requestCount()).toBe(requests);
  });

  it("keeps loading past a first page whose items were all invalid", async () => {
    const { result } = await setup({ total: 45 }, { wrapTransport: withInvalidFirstPage });

    await waitFor(() => expect(result.current.items).toHaveLength(20));
    expect(result.current.status).toBe("success");
    expect(result.current.invalidCount).toBe(20);
  });

  it("stops auto-loading after a bounded number of all-invalid pages", async () => {
    const { result, transport } = await setup({ total: 200, invalidItemRate: 1 });

    await waitFor(() => expect(result.current.status).toBe("empty"));
    expect(transport.requestCount()).toBe(MAX_AUTO_FETCHED_PAGES);
    expect(result.current.hasNextPage).toBe(true);
  });
});
