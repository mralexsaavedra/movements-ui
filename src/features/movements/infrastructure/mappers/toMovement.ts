import type { Movement } from "../../domain/Movement";
import type { ItemDto } from "../dto/ItemDto";

/** Converts a validated contract item into the domain entity. */
export const toMovement = (dto: ItemDto): Movement => ({
  id: dto.id,
  direction: dto.type,
  status: dto.status,
  amount: { value: dto.amount.value, currency: dto.amount.currency },
  counterparty: { name: dto.label.name, imageUrl: dto.label.imageUrl },
  category: dto.category,
  date: new Date(dto.date),
  flagged: dto.flagged,
});
