import { describe, expect, it } from "vitest";
import { runTurn } from "../../src/runtime/pipeline";

describe("runTurn", () => {
  it("does not commit state when verdict is reject", async () => {
    const out = await runTurn({
      rawInputText: "open gate",
      judge: async () => ({
        verdict: "reject",
        reason_code: "MISSING_PREREQ",
        internal_reason: "missing key",
        confidence: 0.95,
        ref_from_judge: "Find the key."
      }),
      narrate: async () => ({
        narration_text: "The gate remains shut.",
        reference: "Search the fountain area first."
      }),
      state: {
        hp: 10,
        approved_interaction_history: [
          { raw_input_text: "look", narration_text: "Old approved narration." }
        ]
      }
    });

    expect(out.state).toEqual({
      hp: 10,
      approved_interaction_history: [
        { raw_input_text: "look", narration_text: "Old approved narration." }
      ]
    });
    expect(out.reference).toBe("Search the fountain area first.");
  });

  it("appends approved_interaction_history only on approve+narrate success", async () => {
    const out = await runTurn({
      rawInputText: "open gate",
      judge: async () => ({
        verdict: "approve",
        reason_code: "RULE_CONFLICT",
        internal_reason: "ok",
        confidence: 0.95,
        ref_from_judge: "Proceed."
      }),
      narrate: async () => ({
        narration_text: "You push the heavy gate open.",
        reference: "Step into the courtyard."
      }),
      state: {
        hp: 10,
        approved_interaction_history: [
          { raw_input_text: "look", narration_text: "n1" },
          { raw_input_text: "inspect gate", narration_text: "n2" }
        ]
      }
    });

    expect(out.state.hp).toBe(10);
    expect(
      (out.state.approved_interaction_history as Array<Record<string, unknown>>).at(-1)
    ).toEqual({
      raw_input_text: "open gate",
      narration_text: "You push the heavy gate open."
    });
    expect(out.reference).toBe("Step into the courtyard.");
  });
});
