import type { ContractIssue } from "./ContractError";

export interface InvalidItemReport {
  /** Position of the item inside the received page. */
  readonly index: number;
  /** The item id when it is readable, so the backend can trace it; otherwise `null`. */
  readonly id: string | null;
  readonly issues: readonly ContractIssue[];
}

/**
 * Port for reporting dropped items (logger, crash reporter, analytics…).
 * Implementations receive locations and reasons only, never raw payload values.
 */
export interface ContractViolationReporter {
  readonly reportInvalidItem: (report: InvalidItemReport) => void;
}
