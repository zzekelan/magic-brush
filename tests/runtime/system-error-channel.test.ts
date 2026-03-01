import { describe, expect, it } from "vitest";
import { runTurn } from "../../src/runtime/pipeline";

describe("system error channel", () => {
  it("returns safe fallback on narrate schema failures", async () => {
    const out = await runTurn({
      rawInputText: "open gate",
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
    expect(out.system_error_detail).toBeUndefined();
    expect(out.debug).toBeUndefined();
  });

  it("does not mutate state when narrate fails", async () => {
    const original = {
      hp: 10,
      approved_interaction_history: [{ raw_input_text: "look", narration_text: "n1" }]
    };
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
        throw new Error("timeout");
      },
      state: original
    });

    expect(out.system_error_code).toBe("NARRATE_CALL_FAILED");
    expect(out.system_error_detail).toBeUndefined();
    expect(out.narration_text).toMatch(/please try again/i);
    expect(out.state).toEqual(original);
  });

  it("passes through judge call failure detail", async () => {
    const out = await runTurn({
      rawInputText: "look",
      judge: async () => {
        throw new Error("ServiceUnavailable request_id=abc123");
      },
      narrate: async () => ({ narration_text: "unused", reference: "unused" }),
      state: {}
    });

    expect(out.system_error_code).toBe("JUDGE_CALL_FAILED");
    expect(out.system_error_detail).toBeUndefined();
  });

  it("rejects extra state_patch on reject in strict mode", async () => {
    let judgeCalls = 0;
    let narrateCalls = 0;
    const out = await runTurn({
      rawInputText: "open gate",
      judge: async () => {
        judgeCalls += 1;
        return {
          verdict: "reject",
          reason_code: "MISSING_PREREQ",
          internal_reason: "missing key",
          confidence: 0.9,
          ref_from_judge: "Find the key first.",
          state_patch: { hp: 0 }
        };
      },
      narrate: async () => {
        narrateCalls += 1;
        return {
          narration_text: "The gate remains sealed.",
          reference: "Search the fountain for a key."
        };
      },
      state: { hp: 10 }
    });

    expect(judgeCalls).toBe(4);
    expect(narrateCalls).toBe(0);
    expect(out.system_error_code).toBe("JUDGE_SCHEMA_INVALID");
    expect(out.system_error_detail).toBeUndefined();
    expect(out.state).toEqual({ hp: 10 });
  });
});
