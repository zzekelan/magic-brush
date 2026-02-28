import { describe, expect, it } from "vitest";
import { buildNarrateContext } from "../../src/context/build-narrate-context";

describe("buildNarrateContext", () => {
  it("maps ref_from_judge and narration_history and does not expose internal_reason", () => {
    const out = buildNarrateContext({
      judge: {
        verdict: "reject",
        reason_code: "MISSING_PREREQ",
        internal_reason: "missing key_id=secret",
        confidence: 0.9,
        ref_from_judge: "Find the key near the fountain."
      },
      narrationHistory: ["Earlier you checked the gate."]
    });

    expect(out.ref_from_judge).toContain("fountain");
    expect(out.narration_history).toEqual(["Earlier you checked the gate."]);
    expect(JSON.stringify(out)).not.toContain("internal_reason");
  });
});
