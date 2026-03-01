import { describe, expect, it } from "vitest";
import { shouldRetryJudge, shouldRetryNarrate } from "../../src/runtime/retry-policy";

describe("shouldRetryJudge", () => {
  it("retries when confidence is below threshold", () => {
    expect(shouldRetryJudge({ confidence: 0.2, schemaValid: true, attempt: 0 })).toBe(true);
  });

  it("does not retry after max attempts", () => {
    expect(shouldRetryJudge({ confidence: 0.1, schemaValid: true, attempt: 3 })).toBe(false);
  });
});

describe("shouldRetryNarrate", () => {
  it("retries before max attempts", () => {
    expect(shouldRetryNarrate({ attempt: 0 })).toBe(true);
  });

  it("does not retry after max attempts", () => {
    expect(shouldRetryNarrate({ attempt: 3 })).toBe(false);
  });
});
