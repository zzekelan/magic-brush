import { describe, expect, it } from "vitest";
import { buildNarrateContext } from "../../src/context/build-narrate-context";

describe("buildNarrateContext", () => {
  it("strips internal_reason and emits safe_hint", () => {
    const out = buildNarrateContext({
      verdict: "reject",
      reason_code: "MISSING_PREREQ",
      internal_reason: "missing item_id=secret_key",
      confidence: 0.9
    });

    expect(JSON.stringify(out)).not.toContain("internal_reason");
    expect(JSON.stringify(out)).not.toContain("secret_key");
    expect(out.safe_hint).toBe("action_rejected");
  });
});
