import { DEFAULT_LOCALE } from "./locale";

type MonthStyle = "short" | "long";

// A long list formats thousands of dates; building an Intl.DateTimeFormat is the expensive part,
// so formatters are memoised per locale, time zone and month style.
const formatters = new Map<string, Intl.DateTimeFormat>();

/**
 * The device zone is resolved on every call, not captured by the cached formatter: a formatter
 * built without `timeZone` would keep the zone of its first use after the user travels.
 */
const deviceTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

const getFormatter = (locale: string, requestedTimeZone: string | undefined, month: MonthStyle) => {
  const timeZone = requestedTimeZone ?? deviceTimeZone();
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

/**
 * Short, unambiguous date for a list row: `7 oct 2026` (es-ES).
 * `timeZone` defaults to the device's; pass one to pin it (tests, server-side rendering).
 */
export const formatMovementDate = (
  date: Date,
  locale: string = DEFAULT_LOCALE,
  timeZone?: string,
): string => getFormatter(locale, timeZone, "short").format(date);

/** Spoken form for accessibility labels, month spelled out: `7 de octubre de 2026` (es-ES). */
export const formatMovementDateForAccessibility = (
  date: Date,
  locale: string = DEFAULT_LOCALE,
  timeZone?: string,
): string => getFormatter(locale, timeZone, "long").format(date);
