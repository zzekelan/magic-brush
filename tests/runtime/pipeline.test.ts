import { describe, expect, it } from "vitest";
import { runTurn } from "../../src/runtime/pipeline";

describe("runTurn", () => {
  it("runs judge then narrate and returns narration", async () => {
    const calls: string[] = [];

    const out = await runTurn({
      judge: async () => {
        calls.push("judge");
        return {
          verdict: "reject",
          reason_code: "MISSING_PREREQ",
          internal_reason: "missing item",
          confidence: 0.9
        };
      },
      narrate: async () => {
        calls.push("narrate");
        return {
          narration_text: "You cannot do that."
        };
      },
      state: {}
    });

    expect(calls).toEqual(["judge", "narrate"]);
    expect(out.narration_text).toBe("You cannot do that.");
  });
});
