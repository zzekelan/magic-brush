import { describe, expect, it } from "vitest";
import { buildJudgeContext } from "../../src/context/build-judge-context";

describe("buildJudgeContext", () => {
  it("includes narration_history from state, defaulting to empty list", () => {
    const withHistory = buildJudgeContext({
      rawInputText: "open the door",
      state: { hp: 10, narration_history: ["turn1", "turn2"] }
    });
    expect(withHistory.narration_history).toEqual(["turn1", "turn2"]);

    const withoutHistory = buildJudgeContext({
      rawInputText: "look",
      state: { hp: 10 }
    });

    expect(withoutHistory.narration_history).toEqual([]);
  });
});
