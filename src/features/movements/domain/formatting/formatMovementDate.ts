import { DEFAULT_LOCALE } from "./locale";

/**
 * Short, unambiguous date for a list row: `7 oct 2026` (es-ES).
 * `timeZone` defaults to the device's; pass one to pin it (tests, server-side rendering).
 */
export const formatMovementDate = (
  date: Date,
  locale: string = DEFAULT_LOCALE,
  timeZone?: string,
): string =>
  new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(timeZone === undefined ? {} : { timeZone }),
  }).format(date);
