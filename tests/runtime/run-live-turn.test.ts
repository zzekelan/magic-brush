import { describe, expect, it, vi } from "vitest";
import { executeTurn } from "../../src/runtime/execute-turn";

describe("executeTurn", () => {
  it("passes context and reports debug.llm stats from provider-style agent output", async () => {
    const judgeRun = vi.fn().mockResolvedValue({
      data: {
        verdict: "reject",
        reason_code: "MISSING_PREREQ",
        internal_reason: "x",
        confidence: 0.9,
        ref_from_judge: "Find the key."
      },
      usage_total_tokens: 120
    });
    const narrateRun = vi.fn().mockResolvedValue({
      data: {
        narration_text: "You hesitate at the gate.",
        reference: "Search the fountain."
      },
      usage_total_tokens: 30
    });
    const state = {
      completed_turn_count: 1,
      approved_interaction_history: [{ raw_input_text: "look", narration_text: "Earlier narration." }]
    };

    const out = await executeTurn({
      rawInputText: "open gate",
      debug: true,
      judgeTemperature: 0.1,
      narrateTemperature: 1.3,
      state,
      judgeAgent: { run: judgeRun },
      narrateAgent: { run: narrateRun }
    });

    expect(judgeRun).toHaveBeenCalledWith({
      raw_input_text: "open gate",
      state_snapshot: {
        completed_turn_count: 1,
        current_turn_index: 2,
        approved_interaction_history: [
          { raw_input_text: "look", narration_text: "Earlier narration." }
        ]
      }
    });
    expect(narrateRun).toHaveBeenCalledWith(
      expect.objectContaining({
        raw_input_text: "open gate",
        state_snapshot: {
          completed_turn_count: 1,
          current_turn_index: 2,
          approved_interaction_history: [
            { raw_input_text: "look", narration_text: "Earlier narration." }
          ]
        }
      })
    );
    expect(out.debug?.llm).toEqual({
      judge: { temperature: 0.1, attempts: 1, usage_total_tokens: 120 },
      narrate: { temperature: 1.3, attempts: 1, usage_total_tokens: 30 },
      usage_total_tokens: 150
    });
    expect(out.state.completed_turn_count).toBe(2);
    expect(out.state).not.toHaveProperty("interaction_turn_count");
    expect(out.state).not.toHaveProperty("current_turn_index");
  });

});
