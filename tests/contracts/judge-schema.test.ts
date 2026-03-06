import { describe, expect, it } from "vitest";
import { JudgeOutputSchema } from "../../src/contracts/judge";

describe("JudgeOutputSchema", () => {
  it("accepts approve payload without state_patch", () => {
    const parsed = JudgeOutputSchema.parse({
      verdict: "approve",
      reason_code: "APPROVED",
      internal_reason: "ok",
      confidence: 0.9,
      ref_from_judge: "Try checking the nearby altar."
    });

    expect(parsed.ref_from_judge).toBe("Try checking the nearby altar.");
  });

  it("rejects legacy state_patch field on approve payload", () => {
    expect(() =>
      JudgeOutputSchema.parse({
        verdict: "approve",
        reason_code: "APPROVED",
        internal_reason: "ok",
        confidence: 0.9,
        ref_from_judge: "Try another action.",
        state_patch: { hp: -1 }
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
