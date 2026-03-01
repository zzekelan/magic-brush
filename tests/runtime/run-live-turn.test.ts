import { describe, expect, it, vi } from "vitest";
import { runLiveTurn } from "../../src/runtime/run-live-turn";

describe("runLiveTurn", () => {
  it("passes narration_history to judge and narrate paths", async () => {
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

    await runLiveTurn({
      rawInputText: "open gate",
      state: { narration_history: ["Earlier narration."] },
      judgeAgent: { run: judgeRun },
      narrateAgent: { run: narrateRun }
    });

    expect(judgeRun).toHaveBeenCalledWith(
      expect.objectContaining({ narration_history: ["Earlier narration."] })
    );
    expect(narrateRun).toHaveBeenCalledWith(
      expect.objectContaining({ narration_history: ["Earlier narration."] })
    );
  });
});
