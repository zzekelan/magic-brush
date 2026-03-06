import { describe, expect, it } from "vitest";
import { runTurnPipeline } from "../../src/runtime/pipeline";

describe("runTurn judge retry", () => {
  it("retries judge on low confidence and continues", async () => {
    let attempts = 0;

    const out = await runTurnPipeline({
      rawInputText: "inspect room",
      judge: async () => {
        attempts += 1;
        if (attempts === 1) {
          return {
            verdict: "reject",
            reason_code: "MISSING_PREREQ",
            internal_reason: "low confidence first pass",
            confidence: 0.2,
            ref_from_judge: "Try inspecting the room."
          };
        }

        return {
          verdict: "reject",
          reason_code: "MISSING_PREREQ",
          internal_reason: "stable",
          confidence: 0.95,
          ref_from_judge: "Try inspecting the room."
        };
      },
      narrate: async () => ({
        narration_text: "You cannot do that.",
        reference: "Inspect the room first."
      }),
      state: { completed_turn_count: 1 }
    });

    expect(attempts).toBe(2);
    expect(out.narration_text).toBe("You cannot do that.");
    expect(out.system_error_code).toBeUndefined();
    expect(out.state.completed_turn_count).toBe(2);
  });

  it("returns judge low-confidence error after retries exhausted", async () => {
    let narrateCalls = 0;

    const out = await runTurnPipeline({
      rawInputText: "inspect room",
      judge: async () => ({
        verdict: "reject",
        reason_code: "MISSING_PREREQ",
        internal_reason: "always uncertain",
        confidence: 0.1,
        ref_from_judge: "Try inspecting the room."
      }),
      narrate: async () => {
        narrateCalls += 1;
        return { narration_text: "unused", reference: "unused" };
      },
      state: { completed_turn_count: 1 }
    });

    expect(out.system_error_code).toBe("JUDGE_LOW_CONFIDENCE");
    expect(out.narration_text).toMatch(/please try again/i);
    expect(narrateCalls).toBe(0);
    expect(out.state.completed_turn_count).toBe(1);
  });

  it("returns judge schema error when judge output remains invalid", async () => {
    const out = await runTurnPipeline({
      rawInputText: "inspect room",
      judge: async () => ({ bad: "payload" }),
      narrate: async () => ({ narration_text: "unused", reference: "unused" }),
      state: { completed_turn_count: 1 }
    });

    expect(out.system_error_code).toBe("JUDGE_SCHEMA_INVALID");
    expect(out.narration_text).toMatch(/please try again/i);
    expect(out.state.completed_turn_count).toBe(1);
  });
});
