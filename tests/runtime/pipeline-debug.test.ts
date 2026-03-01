import { describe, expect, it } from "vitest";
import { runTurn } from "../../src/runtime/pipeline";

describe("runTurn debug channel", () => {
  it("omits debug payload when debug=false", async () => {
    const out = await runTurn({
      rawInputText: "look around",
      debug: false,
      judge: async () => ({
        verdict: "reject",
        reason_code: "MISSING_PREREQ",
        internal_reason: "missing key",
        confidence: 0.95,
        ref_from_judge: "Find the key."
      }),
      narrate: async () => ({
        narration_text: "The gate remains shut.",
        reference: "Search nearby."
      }),
      state: {}
    });

    expect(out.debug).toBeUndefined();
  });

  it("includes debug payload when debug=true", async () => {
    const out = await runTurn({
      rawInputText: "open gate",
      debug: true,
      judge: async () => ({
        verdict: "approve",
        reason_code: "RULE_CONFLICT",
        internal_reason: "ok",
        confidence: 0.95,
        ref_from_judge: "Proceed."
      }),
      narrate: async () => {
        throw new Error("narrate timeout");
      },
      state: { hp: 10, approved_interaction_history: [] }
    });

    expect(out.system_error_code).toBe("NARRATE_CALL_FAILED");
    expect(out.system_error_detail).toBeUndefined();
    expect(out.debug).toEqual(
      expect.objectContaining({
        attempts: { judge: 1, narrate: 4 },
        error: expect.objectContaining({
          system_error_code: "NARRATE_CALL_FAILED",
          system_error_detail: expect.stringContaining("timeout")
        })
      })
    );
    expect(out.debug).toEqual(
      expect.objectContaining({
        judge_context_snapshot: expect.objectContaining({
          raw_input_text: "open gate"
        }),
        narrate_context_snapshot: expect.objectContaining({
          raw_input_text: "open gate"
        })
      })
    );
  });
});
