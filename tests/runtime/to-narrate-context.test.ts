import { describe, expect, it } from "vitest";
import { buildNarrateContext } from "../../src/context/build-narrate-context";

describe("buildNarrateContext", () => {
  it("forwards ref_from_judge and narration_history without exposing internals", () => {
    const out = buildNarrateContext({
      judge: {
        verdict: "reject",
        reason_code: "MISSING_PREREQ",
        internal_reason: "missing item_id=key_rusty_01",
        confidence: 0.9,
        ref_from_judge: "Search the toolbox."
      },
      narrationHistory: ["You inspected the shed."]
    });

    const json = JSON.stringify(out);
    expect(json).not.toContain("internal_reason");
    expect(json).not.toContain("key_rusty_01");
    expect(out.ref_from_judge).toBe("Search the toolbox.");
    expect(out.narration_history).toEqual(["You inspected the shed."]);
  });
});
