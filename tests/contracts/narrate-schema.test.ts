import { describe, expect, it } from "vitest";
import { NarrateOutputSchema } from "../../src/contracts/narrate";

describe("NarrateOutputSchema", () => {
  it("accepts narration payload", () => {
    const parsed = NarrateOutputSchema.parse({
      narration_text: "You cannot do that right now.",
      visible_choices: ["Inspect the gate", "Check inventory"]
    });

    expect(parsed.narration_text).toContain("cannot");
  });
});
