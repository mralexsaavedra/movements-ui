/** A single contract violation, described without the offending value (it may be sensitive). */
export interface ContractIssue {
  /** Dot-separated location inside the payload, e.g. `amount.currency`. Empty for the root. */
  readonly path: string;
  /** Machine-readable reason, e.g. `invalid_type`. */
  readonly code: string;
}

/** Thrown when a response cannot be used at all (e.g. the page envelope is malformed). */
export class ContractError extends Error {
  override readonly name = "ContractError";
  readonly issues: readonly ContractIssue[];

  constructor(message: string, issues: readonly ContractIssue[]) {
    super(message);
    this.issues = issues;
  }
}
