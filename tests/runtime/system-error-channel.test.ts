import { describe, expect, it } from "vitest";
import { runTurn } from "../../src/runtime/pipeline";

describe("system error channel", () => {
  it("returns safe fallback on narrate schema failures", async () => {
    const out = await runTurn({
      judge: async () => ({
        verdict: "reject",
        reason_code: "MISSING_PREREQ",
        internal_reason: "judge fallback",
        confidence: 0.9,
        ref_from_judge: "Try searching nearby."
      }),
      narrate: async () => ({ narration_text: "x" }),
      state: {}
    });

    expect(out.narration_text).toMatch(/please try again/i);
    expect(out.system_error_code).toBe("NARRATE_SCHEMA_INVALID");
    expect(out.system_error_detail).toContain("reference");
  });

  it("does not mutate state when narrate fails", async () => {
    const original = { hp: 10, narration_history: ["n1"] };
    const out = await runTurn({
      judge: async () => ({
        verdict: "approve",
        reason_code: "RULE_CONFLICT",
        internal_reason: "ok",
        confidence: 0.95,
        ref_from_judge: "Proceed.",
        state_patch: { hp: 9 }
      }),
      narrate: async () => {
        throw new Error("timeout");
      },
      state: original
    });

    expect(out.system_error_code).toBe("NARRATE_CALL_FAILED");
    expect(out.system_error_detail).toContain("timeout");
    expect(out.narration_text).toMatch(/please try again/i);
    expect(out.state).toEqual(original);
  });

  it("passes through judge call failure detail", async () => {
    const out = await runTurn({
      judge: async () => {
        throw new Error("ServiceUnavailable request_id=abc123");
      },
      narrate: async () => ({ narration_text: "unused", reference: "unused" }),
      state: {}
    });

    expect(out.system_error_code).toBe("JUDGE_CALL_FAILED");
    expect(out.system_error_detail).toContain("ServiceUnavailable");
    expect(out.system_error_detail).toContain("abc123");
  });
});
