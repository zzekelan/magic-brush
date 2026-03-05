import { describe, expect, it } from "vitest";
import { runTurn } from "../../src/runtime/pipeline";

describe("runTurn", () => {
  it("records reject turn in conversation_context without mutating approved history", async () => {
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
        interaction_turn_count: 2,
        approved_interaction_history: [
          { raw_input_text: "look", narration_text: "Old approved narration." }
        ],
        conversation_context: [
          {
            raw_input_text: "inspect gate",
            narration_text: "The hinges are rusted.",
            verdict: "approve",
            reason_code: "RULE_CONFLICT"
          }
        ]
      }
    });

    expect(out.state.hp).toBe(10);
    expect(out.state.approved_interaction_history).toEqual([
      { raw_input_text: "look", narration_text: "Old approved narration." }
    ]);
    expect(out.state.interaction_turn_count).toBe(3);
    expect(out.state.conversation_context).toEqual([
      {
        raw_input_text: "inspect gate",
        narration_text: "The hinges are rusted.",
        verdict: "approve",
        reason_code: "RULE_CONFLICT"
      },
      {
        raw_input_text: "open gate",
        narration_text: "The gate remains shut.",
        verdict: "reject",
        reason_code: "MISSING_PREREQ"
      }
    ]);
    expect(out.reference).toBe("Search the fountain area first.");
  });

  it("updates approved history and conversation_context on approve+narrate success", async () => {
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
        interaction_turn_count: 2,
        approved_interaction_history: [
          { raw_input_text: "look", narration_text: "n1" },
          { raw_input_text: "inspect gate", narration_text: "n2" }
        ],
        conversation_context: [
          {
            raw_input_text: "inspect gate",
            narration_text: "n2",
            verdict: "approve",
            reason_code: "RULE_CONFLICT"
          }
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
    expect(out.state.interaction_turn_count).toBe(3);
    expect(out.state.conversation_context).toEqual([
      {
        raw_input_text: "inspect gate",
        narration_text: "n2",
        verdict: "approve",
        reason_code: "RULE_CONFLICT"
      },
      {
        raw_input_text: "open gate",
        narration_text: "You push the heavy gate open.",
        verdict: "approve",
        reason_code: "RULE_CONFLICT"
      }
    ]);
    expect(out.reference).toBe("Step into the courtyard.");
  });
});
