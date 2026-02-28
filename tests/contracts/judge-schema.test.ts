import { describe, expect, it } from "vitest";
import { JudgeOutputSchema } from "../../src/contracts/judge";

describe("JudgeOutputSchema", () => {
  it("accepts valid approve payload", () => {
    const parsed = JudgeOutputSchema.parse({
      verdict: "approve",
      reason_code: "RULE_CONFLICT",
      internal_reason: "rule check result",
      confidence: 0.9,
      state_patch: { hp: -1 }
    });

    expect(parsed.verdict).toBe("approve");
  });
});
