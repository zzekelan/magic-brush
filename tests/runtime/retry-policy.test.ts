import { describe, expect, it } from "vitest";
import { shouldRetryJudge } from "../../src/runtime/retry-policy";

describe("shouldRetryJudge", () => {
  it("retries when confidence is below threshold", () => {
    expect(shouldRetryJudge({ confidence: 0.2, schemaValid: true, attempt: 0 })).toBe(true);
  });

  it("does not retry after max attempts", () => {
    expect(shouldRetryJudge({ confidence: 0.1, schemaValid: true, attempt: 2 })).toBe(false);
  });
});
