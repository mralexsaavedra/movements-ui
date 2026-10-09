const FIRST_LETTER_OR_DIGIT = /[\p{L}\p{N}]/u;

/**
 * Up to two initials for an avatar fallback: the first letter or digit of the first and last
 * words (`Acme Payroll` → `AP`, `acme` → `A`). Words without letters or digits are skipped.
 */
export const getInitials = (name: string, locale: string): string => {
  const initials = name
    .split(/\s+/)
    .map((word) => FIRST_LETTER_OR_DIGIT.exec(word)?.[0])
    .filter((initial): initial is string => initial !== undefined);

  const first = initials[0] ?? "";
  const last = initials.length > 1 ? (initials.at(-1) ?? "") : "";
  return `${first}${last}`.toLocaleUpperCase(locale);
};
