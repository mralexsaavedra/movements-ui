import { act, renderHook, waitFor } from "@testing-library/react-native";

import { HttpError } from "@/shared/http/HttpError";

import { createControllableHttpClient } from "../../testing/createControllableHttpClient";
import { createMovementsWrapper } from "../../testing/createMovementsWrapper";
import { useMovementList } from "./useMovementList";

const setup = async (
  options: Parameters<typeof createControllableHttpClient>[0] = {},
  { failing = false } = {},
) => {
  const transport = createControllableHttpClient(options);
  transport.setFailing(failing);
  const { Wrapper } = createMovementsWrapper({ httpClient: transport.httpClient });
  const hook = await renderHook(() => useMovementList(), { wrapper: Wrapper });
  return { ...hook, transport };
};

describe("useMovementList", () => {
  it("starts loading, then shows the first page", async () => {
    const { result } = await setup({ total: 45 });

    expect(result.current.status).toBe("loading");
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

  it("refreshes from the first page while keeping cached rows visible", async () => {
    const { result, transport } = await setup({ total: 45 });
    await waitFor(() => expect(result.current.items).toHaveLength(20));
    await act(async () => result.current.loadMore());
    await waitFor(() => expect(result.current.items).toHaveLength(40));
    const firstRow = result.current.items[0];
    const release = transport.hold();
    const requests = transport.requestCount();

    await act(async () => {
      void result.current.refresh();
    });

    await waitFor(() => expect(result.current.isRefreshing).toBe(true));
    expect(result.current.status).toBe("success");
    expect(result.current.items[0]).toBe(firstRow);
    expect(result.current.items.length).toBeGreaterThan(0);

    release();
    await waitFor(() => expect(result.current.isRefreshing).toBe(false));
    expect(result.current.items).toHaveLength(20);
    expect(transport.requestCount()).toBe(requests + 1);
  });
});
