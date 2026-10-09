import { getInitials } from "./getInitials";

describe("getInitials", () => {
  it.each([
    ["Acme Payroll", "AP"],
    ["acme", "A"],
    ["Northwind Fresh Grocers", "NG"],
    ["  Ébano   Café ", "ÉC"],
    ["7-Eleven Corner", "7C"],
    ["- Dash", "D"],
    ["", ""],
  ])("turns %j into %j", (name, expected) => {
    expect(getInitials(name, "en-GB")).toBe(expected);
  });
});
