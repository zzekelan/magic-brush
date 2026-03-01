import { describe, expect, it } from "vitest";
import { runTurn } from "../../src/runtime/pipeline";

describe("runTurn", () => {
  it("does not commit state when verdict is reject", async () => {
    const out = await runTurn({
      judge: async () => ({
        verdict: "reject",
        reason_code: "MISSING_PREREQ",
        internal_reason: "missing key",
        confidence: 0.95,
        ref_from_judge: "Find the key."
      }),
      narrate: async () => ({
        narration_text: "The gate remains shut.",
        reference: "Search the fountain area first."
      }),
      state: { hp: 10, narration_history: ["old"] }
    });

    expect(out.state).toEqual({ hp: 10, narration_history: ["old"] });
    expect(out.reference).toBe("Search the fountain area first.");
  });

  it("commits state and appends narration history only on approve+narrate success", async () => {
    const out = await runTurn({
      judge: async () => ({
        verdict: "approve",
        reason_code: "RULE_CONFLICT",
        internal_reason: "ok",
        confidence: 0.95,
        ref_from_judge: "Proceed.",
        state_patch: { hp: 9 }
      }),
      narrate: async () => ({
        narration_text: "You push the heavy gate open.",
        reference: "Step into the courtyard."
      }),
      state: { hp: 10, narration_history: ["n1", "n2"] }
    });

    expect(out.state.hp).toBe(9);
    expect((out.state.narration_history as string[]).at(-1)).toBe(
      "You push the heavy gate open."
    );
    expect(out.reference).toBe("Step into the courtyard.");
  });
});
