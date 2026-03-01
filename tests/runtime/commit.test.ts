import { describe, expect, it } from "vitest";
import { commitApprovedInteraction } from "../../src/runtime/commit";

describe("commitApprovedInteraction", () => {
  it("appends an approved interaction and preserves existing state", () => {
    const out = commitApprovedInteraction({
      state: {
        hp: 10,
        approved_interaction_history: [{ raw_input_text: "look", narration_text: "You scan." }]
      },
      rawInputText: "open gate",
      narrationText: "You push the heavy gate open."
    });
    expect(out.hp).toBe(10);
    expect(out.approved_interaction_history).toEqual([
      { raw_input_text: "look", narration_text: "You scan." },
      { raw_input_text: "open gate", narration_text: "You push the heavy gate open." }
    ]);
  });

  it("limits approved_interaction_history to 50 entries", () => {
    const history = Array.from({ length: 55 }, (_, i) => ({
      raw_input_text: `in${i + 1}`,
      narration_text: `n${i + 1}`
    }));
    const out = commitApprovedInteraction({
      state: { approved_interaction_history: history },
      rawInputText: "latest-input",
      narrationText: "latest-narration"
    });
    expect((out.approved_interaction_history as Array<Record<string, unknown>>).length).toBe(50);
    expect(
      (out.approved_interaction_history as Array<Record<string, unknown>>)[0]
    ).toEqual({
      raw_input_text: "in7",
      narration_text: "n7"
    });
    expect((out.approved_interaction_history as Array<Record<string, unknown>>).at(-1)).toEqual({
      raw_input_text: "latest-input",
      narration_text: "latest-narration"
    });
  });
});
