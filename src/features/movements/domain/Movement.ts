export type MovementDirection = "inbound" | "outbound";
export type MovementStatus = "pending" | "confirmed";

/** Unsigned magnitude in a given ISO 4217 currency; the sign comes from the direction. */
export interface Money {
  readonly value: number;
  readonly currency: string;
}

export interface Counterparty {
  readonly name: string;
  readonly imageUrl: string | null;
}

export interface Movement {
  readonly id: string;
  readonly direction: MovementDirection;
  readonly status: MovementStatus;
  readonly amount: Money;
  readonly counterparty: Counterparty;
  readonly category: string;
  readonly date: Date;
  readonly flagged: boolean;
}

export interface MovementsPage {
  readonly items: readonly Movement[];
  /** Opaque cursor for the next page, or `null` at the end of the list. */
  readonly nextCursor: string | null;
  /** Items received for this page but dropped because they broke the contract. */
  readonly invalidCount: number;
}
