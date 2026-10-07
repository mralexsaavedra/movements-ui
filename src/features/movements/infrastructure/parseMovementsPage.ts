import type { z } from "zod";

import { ContractError, type ContractIssue } from "../domain/ContractError";
import type { ContractViolationReporter } from "../domain/ContractViolationReporter";
import type { Movement, MovementsPage } from "../domain/Movement";
import { toMovement } from "./mappers/toMovement";
import { itemSchema, itemsPageEnvelopeSchema } from "./schemas/itemSchema";

/** Keeps where and why validation failed, never the value (it may be sensitive money data). */
const toContractIssues = (error: z.ZodError): ContractIssue[] =>
  error.issues.map((issue) => ({ path: issue.path.map(String).join("."), code: issue.code }));

const readableId = (raw: unknown): string | null => {
  if (typeof raw !== "object" || raw === null || !("id" in raw)) return null;
  return typeof raw.id === "string" && raw.id.length > 0 ? raw.id : null;
};

/**
 * Applies the invalid-data policy to a raw `GET /items` response:
 * - malformed envelope → throws `ContractError` (the page fails and can be retried);
 * - malformed item → dropped, counted in `invalidCount` and reported; valid items are kept.
 */
export const parseMovementsPage = (
  raw: unknown,
  reporter: ContractViolationReporter,
): MovementsPage => {
  const envelope = itemsPageEnvelopeSchema.safeParse(raw);
  if (!envelope.success) {
    throw new ContractError("Invalid items page envelope", toContractIssues(envelope.error));
  }

  const items: Movement[] = [];
  let invalidCount = 0;

  envelope.data.items.forEach((rawItem, index) => {
    const item = itemSchema.safeParse(rawItem);
    if (item.success) {
      items.push(toMovement(item.data));
      return;
    }
    invalidCount += 1;
    reporter.reportInvalidItem({
      index,
      id: readableId(rawItem),
      issues: toContractIssues(item.error),
    });
  });

  return { items, nextCursor: envelope.data.nextCursor, invalidCount };
};
