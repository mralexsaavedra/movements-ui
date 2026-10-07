/**
 * Hand-written mirror of `contract/openapi.yaml` (`Item`, `ItemsPage`).
 * Kept in sync with the Zod schema by a compile-time drift guard in `schemas/itemSchema.ts`.
 */
export type ItemTypeDto = "inbound" | "outbound";
export type ItemStatusDto = "pending" | "confirmed";

export interface AmountDto {
  readonly value: number;
  readonly currency: string;
}

export interface LabelDto {
  readonly name: string;
  readonly imageUrl: string | null;
}

export interface ItemDto {
  readonly id: string;
  readonly type: ItemTypeDto;
  readonly status: ItemStatusDto;
  readonly amount: AmountDto;
  readonly label: LabelDto;
  readonly category: string;
  /** ISO 8601 date-time. */
  readonly date: string;
  readonly flagged: boolean;
}

export interface ItemsPageDto {
  readonly items: readonly ItemDto[];
  readonly nextCursor: string | null;
}
