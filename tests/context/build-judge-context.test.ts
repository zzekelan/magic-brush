import { describe, expect, it } from "vitest";
import { buildJudgeContext } from "../../src/context/build-judge-context";

describe("buildJudgeContext", () => {
  it("builds a deterministic judge context from input and state", () => {
    const ctx = buildJudgeContext({
      rawInputText: "open the door",
      state: { hp: 10, room: "hall" }
    });

    expect(ctx.raw_input_text).toBe("open the door");
    expect(ctx.state_snapshot).toEqual({ hp: 10, room: "hall" });
  });
});
