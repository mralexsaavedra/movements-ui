/**
 * ICU output uses non-breaking (U+00A0) and narrow non-breaking (U+202F) spaces, and which
 * one depends on the ICU version. Tests compare against plain spaces instead of hardcoding them.
 */
export const normalizeSpaces = (text: string): string => text.replace(/[  ]/g, " ");
