import { describe, expect, it } from "vitest";
import { toNarrateContext } from "../../src/runtime/to-narrate-context";

describe("toNarrateContext", () => {
  it("does not expose internal_reason or internal ids", () => {
    const out = toNarrateContext({
      verdict: "reject",
      reason_code: "MISSING_PREREQ",
      internal_reason: "missing item_id=key_rusty_01"
    });

    const json = JSON.stringify(out);
    expect(json).not.toContain("internal_reason");
    expect(json).not.toContain("key_rusty_01");
  });
});
