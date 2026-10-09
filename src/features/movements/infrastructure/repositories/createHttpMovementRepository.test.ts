import type { HttpClient, HttpRequestOptions } from "@/shared/http/HttpClient";
import { HttpError } from "@/shared/http/HttpError";

import { ContractError } from "../../domain/ContractError";
import type { ContractViolationReporter } from "../../domain/ContractViolationReporter";
import { buildItemDto, buildItemsPageDto, itemDtos } from "../__fixtures__/itemDtos";
import { createHttpMovementRepository } from "./createHttpMovementRepository";

const createFakeHttpClient = (respond: () => Promise<unknown>) => {
  const get = jest.fn<Promise<unknown>, [string, HttpRequestOptions?]>(() => respond());
  const httpClient: HttpClient = { get };
  return { httpClient, get };
};

const createReporter = () => {
  const reportInvalidItem = jest.fn<
    void,
    Parameters<ContractViolationReporter["reportInvalidItem"]>
  >();
  return { reporter: { reportInvalidItem }, reportInvalidItem };
};

describe("createHttpMovementRepository", () => {
  it("requests GET /items with the limit and without a cursor for the first page", async () => {
    const { httpClient, get } = createFakeHttpClient(() => Promise.resolve(buildItemsPageDto()));
    const repository = createHttpMovementRepository({
      httpClient,
      reporter: createReporter().reporter,
    });

    await repository.getMovements({ limit: 20 });

    expect(get).toHaveBeenCalledTimes(1);
    expect(get.mock.calls[0]?.[0]).toBe("/items");
    expect(get.mock.calls[0]?.[1]?.query).toEqual({ cursor: undefined, limit: 20 });
  });

  it("forwards the cursor and the abort signal", async () => {
    const { httpClient, get } = createFakeHttpClient(() => Promise.resolve(buildItemsPageDto()));
    const repository = createHttpMovementRepository({
      httpClient,
      reporter: createReporter().reporter,
    });
    const controller = new AbortController();

    await repository.getMovements({ cursor: "abc", limit: 50, signal: controller.signal });

    expect(get.mock.calls[0]?.[1]).toEqual({
      query: { cursor: "abc", limit: 50 },
      signal: controller.signal,
    });
  });

  it("maps a valid page into domain movements", async () => {
    const { httpClient } = createFakeHttpClient(() => Promise.resolve(buildItemsPageDto()));
    const repository = createHttpMovementRepository({
      httpClient,
      reporter: createReporter().reporter,
    });

    const page = await repository.getMovements({ limit: 20 });

    expect(page.items.map((movement) => movement.id)).toEqual(itemDtos.map((dto) => dto.id));
    expect(page.items[0]?.date).toBeInstanceOf(Date);
    expect(page.nextCursor).toBe("cursor-2");
    expect(page.invalidCount).toBe(0);
  });

  it("drops and reports invalid items through the injected reporter", async () => {
    const invalid = buildItemDto({ id: "mv-bad", amount: { value: 1, currency: "eur" } });
    const { httpClient } = createFakeHttpClient(() =>
      Promise.resolve({ items: [itemDtos[0], invalid], nextCursor: null }),
    );
    const { reporter, reportInvalidItem } = createReporter();
    const repository = createHttpMovementRepository({ httpClient, reporter });

    const page = await repository.getMovements({ limit: 20 });

    expect(page.items.map((movement) => movement.id)).toEqual([itemDtos[0].id]);
    expect(page.invalidCount).toBe(1);
    expect(reportInvalidItem).toHaveBeenCalledWith(expect.objectContaining({ id: "mv-bad" }));
  });

  it("rejects with a ContractError when the envelope breaks the contract", async () => {
    const { httpClient } = createFakeHttpClient(() => Promise.resolve({ data: [] }));
    const repository = createHttpMovementRepository({
      httpClient,
      reporter: createReporter().reporter,
    });

    await expect(repository.getMovements({ limit: 20 })).rejects.toBeInstanceOf(ContractError);
  });

  it("propagates transport errors untouched", async () => {
    const httpError = new HttpError(503, "Service unavailable");
    const { httpClient } = createFakeHttpClient(() => Promise.reject(httpError));
    const repository = createHttpMovementRepository({
      httpClient,
      reporter: createReporter().reporter,
    });

    await expect(repository.getMovements({ limit: 20 })).rejects.toBe(httpError);
  });
});
