import { describe, expect, it, vi } from "vitest";
import { runLiveTurn } from "../../src/runtime/run-live-turn";

describe("runLiveTurn", () => {
  it("passes raw_input_text and state_snapshot to judge and narrate paths", async () => {
    const judgeRun = vi.fn().mockResolvedValue({
      verdict: "reject",
      reason_code: "MISSING_PREREQ",
      internal_reason: "x",
      confidence: 0.9,
      ref_from_judge: "Find the key."
    });
    const narrateRun = vi.fn().mockResolvedValue({
      narration_text: "You hesitate at the gate.",
      reference: "Search the fountain."
    });
    const state = {
      approved_interaction_history: [{ raw_input_text: "look", narration_text: "Earlier narration." }]
    };

    await runLiveTurn({
      rawInputText: "open gate",
      state,
      judgeAgent: { run: judgeRun },
      narrateAgent: { run: narrateRun }
    });

    expect(judgeRun).toHaveBeenCalledWith({
      raw_input_text: "open gate",
      state_snapshot: state
    });
    expect(narrateRun).toHaveBeenCalledWith(
      expect.objectContaining({
        raw_input_text: "open gate",
        state_snapshot: state
      })
    );
  });
});
