import { ContractError } from "../domain/ContractError";
import type { ContractViolationReporter } from "../domain/ContractViolationReporter";
import { buildItemDto, buildItemsPageDto, itemDtos } from "./__fixtures__/itemDtos";
import { parseMovementsPage } from "./parseMovementsPage";

const createReporter = () => {
  const reportInvalidItem = jest.fn<
    void,
    Parameters<ContractViolationReporter["reportInvalidItem"]>
  >();
  return { reporter: { reportInvalidItem }, reportInvalidItem };
};

describe("parseMovementsPage", () => {
  it("maps every item of a valid page", () => {
    const { reporter, reportInvalidItem } = createReporter();

    const page = parseMovementsPage(buildItemsPageDto(), reporter);

    expect(page.items.map((m) => m.id)).toEqual(itemDtos.map((dto) => dto.id));
    expect(page.items[0]?.date).toEqual(new Date(itemDtos[0].date));
    expect(page.nextCursor).toBe("cursor-2");
    expect(page.invalidCount).toBe(0);
    expect(reportInvalidItem).not.toHaveBeenCalled();
  });

  it("passes a null nextCursor through (end of list)", () => {
    const page = parseMovementsPage(
      buildItemsPageDto({ nextCursor: null }),
      createReporter().reporter,
    );

    expect(page.nextCursor).toBeNull();
  });

  it("accepts an empty page", () => {
    const page = parseMovementsPage({ items: [], nextCursor: null }, createReporter().reporter);

    expect(page).toEqual({ items: [], nextCursor: null, invalidCount: 0 });
  });

  it.each([
    ["null", null],
    ["a string", "oops"],
    ["an array", []],
    ["items missing", { nextCursor: null }],
    ["items not an array", { items: {}, nextCursor: null }],
    ["nextCursor missing", { items: [] }],
    ["nextCursor a number", { items: [], nextCursor: 2 }],
  ])("throws ContractError when the envelope is %s", (_, raw) => {
    const { reporter } = createReporter();

    expect(() => parseMovementsPage(raw, reporter)).toThrow(ContractError);
  });

  it("describes envelope issues by path without leaking values", () => {
    let error: unknown;
    try {
      parseMovementsPage({ items: [], nextCursor: 12345 }, createReporter().reporter);
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(ContractError);
    const contractError = error as ContractError;
    expect(contractError.issues).toEqual([{ path: "nextCursor", code: "invalid_type" }]);
    expect(JSON.stringify(contractError.issues)).not.toContain("12345");
  });

  it("drops an invalid item, keeps the valid ones and reports it without raw values", () => {
    const { reporter, reportInvalidItem } = createReporter();
    const invalid = buildItemDto({ id: "mv-bad", amount: { value: -98765.43, currency: "EUR" } });
    const raw = { items: [itemDtos[0], invalid, itemDtos[1]], nextCursor: null };

    const page = parseMovementsPage(raw, reporter);

    expect(page.items.map((m) => m.id)).toEqual([itemDtos[0].id, itemDtos[1].id]);
    expect(page.invalidCount).toBe(1);
    expect(reportInvalidItem).toHaveBeenCalledTimes(1);
    expect(reportInvalidItem).toHaveBeenCalledWith({
      index: 1,
      id: "mv-bad",
      issues: [{ path: "amount.value", code: "too_small" }],
    });
    expect(JSON.stringify(reportInvalidItem.mock.calls)).not.toContain("98765");
  });

  it("reports a null id when the invalid item has no readable id", () => {
    const { reporter, reportInvalidItem } = createReporter();

    const page = parseMovementsPage({ items: [42, { id: 7 }], nextCursor: null }, reporter);

    expect(page.invalidCount).toBe(2);
    expect(reportInvalidItem.mock.calls.map(([report]) => [report.index, report.id])).toEqual([
      [0, null],
      [1, null],
    ]);
  });

  it.each([
    ["a negative amount", { amount: { value: -1, currency: "EUR" } }, "amount.value"],
    ["a non-finite amount", { amount: { value: Infinity, currency: "EUR" } }, "amount.value"],
    ["a lowercase currency", { amount: { value: 1, currency: "eur" } }, "amount.currency"],
    ["a non-ISO currency", { amount: { value: 1, currency: "EURO" } }, "amount.currency"],
    ["a non-ISO date", { date: "07/10/2026" }, "date"],
    ["a date without timezone", { date: "2026-10-07T09:15:00" }, "date"],
    ["an empty id", { id: "" }, "id"],
    ["an empty name", { label: { name: "", imageUrl: null } }, "label.name"],
    [
      "a non-http image URL",
      { label: { name: "Lumen", imageUrl: "javascript:alert(1)" } },
      "label.imageUrl",
    ],
    ["an unknown type", { type: "refund" }, "type"],
    ["an unknown status", { status: "cancelled" }, "status"],
  ])("rejects an item with %s", (_, overrides, path) => {
    const { reporter, reportInvalidItem } = createReporter();
    const item = { ...buildItemDto(), ...overrides };

    const page = parseMovementsPage({ items: [item], nextCursor: null }, reporter);

    expect(page.items).toEqual([]);
    expect(page.invalidCount).toBe(1);
    expect(reportInvalidItem.mock.calls[0]?.[0].issues.map((issue) => issue.path)).toContain(path);
  });
});
