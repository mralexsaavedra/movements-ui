import type { Money, MovementDirection } from "../Movement";
import { DEFAULT_LOCALE } from "./locale";

/** Typographic minus (U+2212): same width as `+` and read as "minus" by screen readers. */
export const MINUS_SIGN = "−";

export interface AmountSignWords {
  readonly plus: string;
  readonly minus: string;
}

const DEFAULT_SIGN_WORDS: AmountSignWords = { plus: "plus", minus: "minus" };

type CurrencyDisplay = "symbol" | "name";

// Building an Intl.NumberFormat is expensive and a long list formats thousands of amounts,
// so formatters are memoised per locale, currency and display.
const formatters = new Map<string, Intl.NumberFormat>();

const formatMagnitude = (amount: Money, locale: string, display: CurrencyDisplay): string => {
  const key = `${locale}|${amount.currency}|${display}`;
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: amount.currency,
      currencyDisplay: display,
      // The sign is ours (it comes from the direction); fraction digits are the currency's own.
      signDisplay: "never",
    });
    formatters.set(key, formatter);
  }
  return formatter.format(amount.value);
};

const hasSign = (amount: Money): boolean => amount.value !== 0;

/** `+12.345,50 €` (inbound), `−42,90 €` (outbound), `0,00 €` (zero). */
export const formatAmount = (
  amount: Money,
  direction: MovementDirection,
  locale: string = DEFAULT_LOCALE,
): string => {
  const magnitude = formatMagnitude(amount, locale, "symbol");
  if (!hasSign(amount)) return magnitude;
  return `${direction === "inbound" ? "+" : MINUS_SIGN}${magnitude}`;
};

/** Spoken form for accessibility labels: `plus 12.345,50 euros`. */
export const formatAmountForAccessibility = (
  amount: Money,
  direction: MovementDirection,
  locale: string = DEFAULT_LOCALE,
  words: AmountSignWords = DEFAULT_SIGN_WORDS,
): string => {
  const magnitude = formatMagnitude(amount, locale, "name");
  if (!hasSign(amount)) return magnitude;
  return `${direction === "inbound" ? words.plus : words.minus} ${magnitude}`;
};
