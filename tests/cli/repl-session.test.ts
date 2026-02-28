import { describe, expect, it } from "vitest";
import { applyReplCommand, shouldExit } from "../../src/cli/repl-session";

describe("repl session helpers", () => {
  it("resets state on /reset", () => {
    const next = applyReplCommand("/reset", { hp: 9, narration_history: ["x"] });
    expect(next).toEqual({});
  });

  it("detects exit command", () => {
    expect(shouldExit("/exit")).toBe(true);
    expect(shouldExit("look around")).toBe(false);
  });
});
