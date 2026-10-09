import { shouldRetry } from "@/shared/query/shouldRetry";

import { ContractError } from "../../domain/ContractError";

describe("retry policy for movements errors", () => {
  it("does not retry a contract violation: the same payload would fail again", () => {
    expect(shouldRetry(0, new ContractError("Invalid items page envelope", []))).toBe(false);
  });
});
