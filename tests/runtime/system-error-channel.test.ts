import { describe, expect, it } from "vitest";
import { runTurn } from "../../src/runtime/pipeline";

describe("system error channel", () => {
  it("returns safe fallback on narrate schema failures", async () => {
    const out = await runTurn({
      judge: async () => ({
        verdict: "reject",
        reason_code: "SYSTEM_ERROR",
        internal_reason: "judge fallback",
        confidence: 0.9
      }),
      narrate: async () => ({ bad: "payload" }),
      state: {}
    });

    expect(out.narration_text).toContain("Please try again");
    expect(out.system_error_code).toBe("NARRATE_SCHEMA_INVALID");
  });
});
