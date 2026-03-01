import { describe, expect, it } from "vitest";
import { NarrateOutputSchema } from "../../src/contracts/narrate";

describe("NarrateOutputSchema", () => {
  it("requires reference as non-empty string", () => {
    const parsed = NarrateOutputSchema.parse({
      narration_text: "You step into the corridor.",
      reference: "Based on your previous attempt, the left path is safer."
    });

    expect(parsed.reference).toContain("left path");
  });

  it("rejects legacy visible_choices field-only payload", () => {
    expect(() =>
      NarrateOutputSchema.parse({
        narration_text: "You cannot do that.",
        visible_choices: ["Inspect gate"]
      })
    ).toThrow();
  });
});
