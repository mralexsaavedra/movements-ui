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

interface CurrencyFormatter {
  readonly format: (value: number) => string;
  /** Fraction digits the currency is shown with (2 for EUR, 0 for JPY). */
  readonly fractionDigits: number;
}

// Building an Intl.NumberFormat is expensive and a long list formats thousands of amounts,
// so formatters are memoised per locale, currency and display.
const formatters = new Map<string, CurrencyFormatter>();

const getFormatter = (amount: Money, locale: string, display: CurrencyDisplay) => {
  const key = `${locale}|${amount.currency}|${display}`;
  let formatter = formatters.get(key);
  if (!formatter) {
    const intl = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: amount.currency,
      currencyDisplay: display,
      // The sign is ours (it comes from the direction); fraction digits are the currency's own.
      signDisplay: "never",
    });
    formatter = {
      format: (value) => intl.format(value),
      fractionDigits: intl.resolvedOptions().maximumFractionDigits ?? 0,
    };
    formatters.set(key, formatter);
  }
  return formatter;
};

/**
 * Formats the magnitude and decides the sign from the value as displayed: an amount that
 * rounds to zero at the currency's precision (0.004 EUR → 0,00 €) must not read "+0,00 €".
 */
const formatMagnitude = (amount: Money, locale: string, display: CurrencyDisplay) => {
  const { format, fractionDigits } = getFormatter(amount, locale, display);
  const displayedUnits = Math.round(Math.abs(amount.value) * 10 ** fractionDigits);
  return { text: format(amount.value), signed: displayedUnits !== 0 };
};

/** `+12.345,50 €` (inbound), `−42,90 €` (outbound), `0,00 €` (zero). */
export const formatAmount = (
  amount: Money,
  direction: MovementDirection,
  locale: string = DEFAULT_LOCALE,
): string => {
  const { text, signed } = formatMagnitude(amount, locale, "symbol");
  if (!signed) return text;
  return `${direction === "inbound" ? "+" : MINUS_SIGN}${text}`;
};

/** Spoken form for accessibility labels: `plus 12.345,50 euros`. */
export const formatAmountForAccessibility = (
  amount: Money,
  direction: MovementDirection,
  locale: string = DEFAULT_LOCALE,
  words: AmountSignWords = DEFAULT_SIGN_WORDS,
): string => {
  const { text, signed } = formatMagnitude(amount, locale, "name");
  if (!signed) return text;
  return `${direction === "inbound" ? words.plus : words.minus} ${text}`;
};
