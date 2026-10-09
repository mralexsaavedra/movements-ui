import { decodeCursor, encodeCursor } from "./cursor";

describe("mock cursor", () => {
  it.each([0, 1, 20, 4980])("round-trips offset %i", (offset) => {
    expect(decodeCursor(encodeCursor(offset))).toBe(offset);
  });

  it("does not expose the offset in clear text (clients must treat it as opaque)", () => {
    expect(encodeCursor(40)).not.toContain("40");
  });

  it.each([
    ["an empty string", ""],
    ["random text", "page-2"],
    ["a plain number", "20"],
    ["a negative offset", encodeCursor(-1)],
    ["a non-integer offset", btoa("offset:1.5")],
  ])("rejects %s", (_, cursor) => {
    expect(decodeCursor(cursor)).toBeNull();
  });
});
