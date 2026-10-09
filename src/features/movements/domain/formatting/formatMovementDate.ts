import { DEFAULT_LOCALE } from "./locale";

type MonthStyle = "short" | "long";

// A long list formats thousands of dates; building an Intl.DateTimeFormat is the expensive part,
// so formatters are memoised per locale, time zone and month style. The time zone is always
// explicit: reading the device zone is the UI's job (`useI18n().timeZone`), which keeps this pure.
const formatters = new Map<string, Intl.DateTimeFormat>();

const getFormatter = (locale: string, timeZone: string, month: MonthStyle) => {
  const key = `${locale}|${timeZone}|${month}`;
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month,
      year: "numeric",
      timeZone,
    });
    formatters.set(key, formatter);
  }
  return formatter;
};

/** Short, unambiguous date for a list row: `7 oct 2026` (es-ES), calendar day in `timeZone`. */
export const formatMovementDate = (
  date: Date,
  locale: string = DEFAULT_LOCALE,
  timeZone: string,
): string => getFormatter(locale, timeZone, "short").format(date);

/** Spoken form for accessibility labels, month spelled out: `7 de octubre de 2026` (es-ES). */
export const formatMovementDateForAccessibility = (
  date: Date,
  locale: string = DEFAULT_LOCALE,
  timeZone: string,
): string => getFormatter(locale, timeZone, "long").format(date);
