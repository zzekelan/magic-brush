import { describe, expect, it } from "vitest";
import { JudgeOutputSchema } from "../../src/contracts/judge";

describe("JudgeOutputSchema", () => {
  it("requires ref_from_judge for approve", () => {
    const parsed = JudgeOutputSchema.parse({
      verdict: "approve",
      reason_code: "RULE_CONFLICT",
      internal_reason: "ok",
      confidence: 0.9,
      ref_from_judge: "Try checking the nearby altar.",
      state_patch: { hp: -1 }
    });

    expect(parsed.ref_from_judge).toBe("Try checking the nearby altar.");
  });

  it("rejects approve payload when state_patch is missing", () => {
    expect(() =>
      JudgeOutputSchema.parse({
        verdict: "approve",
        reason_code: "RULE_CONFLICT",
        internal_reason: "ok",
        confidence: 0.9,
        ref_from_judge: "Try another action."
      })
    ).toThrow();
  });

  it("rejects legacy suggested_alternatives field", () => {
    expect(() =>
      JudgeOutputSchema.parse({
        verdict: "reject",
        reason_code: "MISSING_PREREQ",
        internal_reason: "missing key",
        confidence: 0.9,
        ref_from_judge: "Find the key first.",
        suggested_alternatives: ["look around"]
      })
    ).toThrow();
  });
});
