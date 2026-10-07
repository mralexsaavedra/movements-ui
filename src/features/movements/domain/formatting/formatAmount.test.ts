import { normalizeSpaces } from "@/shared/testing/normalizeSpaces";

import type { Money } from "../Movement";
import { MINUS_SIGN, formatAmount, formatAmountForAccessibility } from "./formatAmount";

const eur = (value: number): Money => ({ value, currency: "EUR" });

describe("formatAmount", () => {
  it("prefixes inbound amounts with a plus sign", () => {
    expect(normalizeSpaces(formatAmount(eur(42.9), "inbound"))).toBe("+42,90 €");
  });

  it("prefixes outbound amounts with a true minus sign (U+2212), not a hyphen", () => {
    const formatted = formatAmount(eur(42.9), "outbound");

    expect(normalizeSpaces(formatted)).toBe("−42,90 €");
    expect(formatted.startsWith(MINUS_SIGN)).toBe(true);
    expect(formatted).not.toContain("-");
  });

  it.each(["inbound", "outbound"] as const)(
    "shows a zero %s amount without a sign",
    (direction) => {
      expect(normalizeSpaces(formatAmount(eur(0), direction))).toBe("0,00 €");
    },
  );

  it("groups thousands with the es-ES separator for five-digit values", () => {
    expect(normalizeSpaces(formatAmount(eur(12345.5), "inbound"))).toBe("+12.345,50 €");
  });

  it.each([
    ["EUR", 89.99, "−89,99 €"],
    ["USD", 89.99, "−89,99 US$"],
    ["JPY", 35000, "−35.000 JPY"],
  ])("uses the %s symbol and its own fraction digits", (currency, value, expected) => {
    expect(normalizeSpaces(formatAmount({ value, currency }, "outbound"))).toBe(expected);
  });

  it("rounds to the currency's fraction digits (JPY has none)", () => {
    expect(normalizeSpaces(formatAmount({ value: 35000.4, currency: "JPY" }, "inbound"))).toBe(
      "+35.000 JPY",
    );
  });

  it("accepts another locale", () => {
    expect(formatAmount(eur(12345.5), "outbound", "en-US")).toBe("−€12,345.50");
  });
});

describe("formatAmountForAccessibility", () => {
  it.each([
    ["inbound", "plus 12.345,50 euros"],
    ["outbound", "minus 12.345,50 euros"],
  ] as const)("speaks the %s sign as a word and the currency by name", (direction, expected) => {
    expect(normalizeSpaces(formatAmountForAccessibility(eur(12345.5), direction))).toBe(expected);
  });

  it("speaks a zero amount without a sign word", () => {
    expect(normalizeSpaces(formatAmountForAccessibility(eur(0), "outbound"))).toBe("0,00 euros");
  });

  it("accepts a locale and custom sign words", () => {
    const spoken = formatAmountForAccessibility({ value: 1, currency: "USD" }, "inbound", "en-US", {
      plus: "received",
      minus: "spent",
    });

    expect(normalizeSpaces(spoken)).toBe("received 1.00 US dollars");
  });
});
