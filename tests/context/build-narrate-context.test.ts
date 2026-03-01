import { describe, expect, it } from "vitest";
import { buildNarrateContext } from "../../src/context/build-narrate-context";

describe("buildNarrateContext", () => {
  it("maps raw_input_text + state_snapshot and does not expose internal_reason", () => {
    const state = { approved_interaction_history: [{ raw_input_text: "look", narration_text: "x" }] };
    const out = buildNarrateContext({
      rawInputText: "open gate",
      judge: {
        verdict: "reject",
        reason_code: "MISSING_PREREQ",
        internal_reason: "missing key_id=secret",
        confidence: 0.9,
        ref_from_judge: "Find the key near the fountain."
      },
      state
    });

    expect(out.ref_from_judge).toContain("fountain");
    expect(out.raw_input_text).toBe("open gate");
    expect(out.state_snapshot).toEqual(state);
    expect(JSON.stringify(out)).not.toContain("internal_reason");
  });
});
