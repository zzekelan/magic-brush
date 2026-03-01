import { describe, expect, it } from "vitest";
import { runTurn } from "../../src/runtime/pipeline";

describe("runTurn narrate retry", () => {
  it("retries narrate and succeeds on a later attempt", async () => {
    let narrateCalls = 0;
    const out = await runTurn({
      rawInputText: "open gate",
      judge: async () => ({
        verdict: "approve",
        reason_code: "RULE_CONFLICT",
        internal_reason: "ok",
        confidence: 0.95,
        ref_from_judge: "Proceed."
      }),
      narrate: async () => {
        narrateCalls += 1;
        if (narrateCalls < 3) {
          throw new Error("temporary provider issue");
        }
        return {
          narration_text: "The gate opens.",
          reference: "Step through."
        };
      },
      state: {}
    });

    expect(narrateCalls).toBe(3);
    expect(out.system_error_code).toBeUndefined();
    expect(
      (out.state.approved_interaction_history as Array<Record<string, unknown>>).at(-1)
    ).toEqual({
      raw_input_text: "open gate",
      narration_text: "The gate opens."
    });
  });

  it("returns narrate schema error after retries are exhausted", async () => {
    let narrateCalls = 0;
    const out = await runTurn({
      rawInputText: "open gate",
      judge: async () => ({
        verdict: "reject",
        reason_code: "MISSING_PREREQ",
        internal_reason: "missing key",
        confidence: 0.95,
        ref_from_judge: "Find the key."
      }),
      narrate: async () => {
        narrateCalls += 1;
        return { narration_text: "invalid missing reference" };
      },
      state: {}
    });

    expect(narrateCalls).toBe(4);
    expect(out.system_error_code).toBe("NARRATE_SCHEMA_INVALID");
  });

  it("returns narrate call failure after retries are exhausted", async () => {
    let narrateCalls = 0;
    const out = await runTurn({
      rawInputText: "open gate",
      judge: async () => ({
        verdict: "reject",
        reason_code: "MISSING_PREREQ",
        internal_reason: "missing key",
        confidence: 0.95,
        ref_from_judge: "Find the key."
      }),
      narrate: async () => {
        narrateCalls += 1;
        throw new Error("narrate timeout");
      },
      state: {}
    });

    expect(narrateCalls).toBe(4);
    expect(out.system_error_code).toBe("NARRATE_CALL_FAILED");
    expect(out.system_error_detail).toBeUndefined();
  });
});
