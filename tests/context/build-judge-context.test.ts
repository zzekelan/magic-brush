import { describe, expect, it } from "vitest";
import { buildJudgeContext } from "../../src/context/build-judge-context";

describe("buildJudgeContext", () => {
  it("maps raw_input_text and state_snapshot", () => {
    const state = { hp: 10, approved_interaction_history: [] };
    const out = buildJudgeContext({
      rawInputText: "open the door",
      state
    });

    expect(out).toEqual({
      raw_input_text: "open the door",
      state_snapshot: state
    });
  });
});
