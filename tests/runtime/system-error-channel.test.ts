import { describe, expect, it } from "vitest";
import { runTurn } from "../../src/runtime/pipeline";

describe("system error channel", () => {
  it("returns safe fallback on narrate schema failures", async () => {
    const out = await runTurn({
      judge: async () => ({
        verdict: "reject",
        reason_code: "MISSING_PREREQ",
        internal_reason: "judge fallback",
        confidence: 0.9
      }),
      narrate: async () => ({ bad: "payload" }),
      state: {}
    });

    expect(out.narration_text).toMatch(/please try again/i);
    expect(out.system_error_code).toBe("NARRATE_SCHEMA_INVALID");
  });

  it("returns non-schema narrate call failures with dedicated code", async () => {
    const out = await runTurn({
      judge: async () => ({
        verdict: "reject",
        reason_code: "MISSING_PREREQ",
        internal_reason: "judge fallback",
        confidence: 0.9
      }),
      narrate: async () => {
        throw new Error("timeout");
      },
      state: {}
    });

    expect(out.system_error_code).toBe("NARRATE_CALL_FAILED");
    expect(out.narration_text).toMatch(/please try again/i);
  });
});
