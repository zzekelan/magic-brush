import { describe, expect, it } from "vitest";
import { buildNarrateContext } from "../../src/context/build-narrate-context";

describe("buildNarrateContext", () => {
  it("forwards raw_input_text, state_snapshot and ref_from_judge without exposing internals", () => {
    const state = {
      approved_interaction_history: [{ raw_input_text: "inspect shed", narration_text: "You inspected." }]
    };
    const out = buildNarrateContext({
      rawInputText: "open gate",
      judge: {
        verdict: "reject",
        reason_code: "MISSING_PREREQ",
        internal_reason: "missing item_id=key_rusty_01",
        confidence: 0.9,
        ref_from_judge: "Search the toolbox."
      },
      state
    });

    const json = JSON.stringify(out);
    expect(json).not.toContain("internal_reason");
    expect(json).not.toContain("key_rusty_01");
    expect(out.raw_input_text).toBe("open gate");
    expect(out.ref_from_judge).toBe("Search the toolbox.");
    expect(out.state_snapshot).toEqual(state);
  });
});
