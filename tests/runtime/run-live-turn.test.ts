import { describe, expect, it, vi } from "vitest";
import { runLiveTurn } from "../../src/runtime/run-live-turn";

describe("runLiveTurn", () => {
  it("builds judge context and returns narrate output", async () => {
    const judgeRun = vi.fn().mockResolvedValue({
      verdict: "reject",
      reason_code: "MISSING_PREREQ",
      internal_reason: "missing key",
      confidence: 0.9
    });
    const narrateRun = vi.fn().mockResolvedValue({ narration_text: "Nope." });

    const out = await runLiveTurn({
      rawInputText: "open gate",
      state: { hp: 10 },
      judgeAgent: { run: judgeRun },
      narrateAgent: { run: narrateRun }
    });

    expect(judgeRun).toHaveBeenCalledTimes(1);
    expect(narrateRun).toHaveBeenCalledTimes(1);
    expect(out.narration_text).toBe("Nope.");
  });
});
