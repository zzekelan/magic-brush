import { describe, expect, it } from "vitest";
import { commitApprovedState } from "../../src/runtime/commit";

describe("commitApprovedState", () => {
  it("applies patch and appends latest narration", () => {
    const out = commitApprovedState({
      state: { hp: 10, narration_history: ["n1", "n2"] },
      statePatch: { hp: 9, room: "gate" },
      narrationText: "You push the heavy gate open."
    });
    expect(out.hp).toBe(9);
    expect(out.room).toBe("gate");
    expect(out.narration_history).toEqual(["n1", "n2", "You push the heavy gate open."]);
  });

  it("limits narration_history to 50 entries", () => {
    const history = Array.from({ length: 55 }, (_, i) => `n${i + 1}`);
    const out = commitApprovedState({
      state: { narration_history: history },
      statePatch: {},
      narrationText: "latest"
    });
    expect((out.narration_history as string[]).length).toBe(50);
    expect((out.narration_history as string[])[0]).toBe("n7");
    expect((out.narration_history as string[]).at(-1)).toBe("latest");
  });
});
