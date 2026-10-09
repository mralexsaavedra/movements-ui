const PREFIX = "offset:";
const CURSOR_PATTERN = /^offset:(\d+)$/;

/**
 * The mock encodes an offset, base64-wrapped so it does not look like a page number.
 * Clients must treat cursors as opaque strings: only pass back what `nextCursor` returned.
 * A real backend is free to use keyset/ids instead without any client change.
 */
export const encodeCursor = (offset: number): string => btoa(`${PREFIX}${offset}`);

/** Returns the offset, or `null` when the cursor was not issued by this mock. */
export const decodeCursor = (cursor: string): number | null => {
  let decoded: string;
  try {
    decoded = atob(cursor);
  } catch {
    return null;
  }
  const digits = CURSOR_PATTERN.exec(decoded)?.[1];
  if (digits === undefined) return null;
  const offset = Number(digits);
  return Number.isSafeInteger(offset) ? offset : null;
};
