import { describe, expect, it, vi } from "vitest";
import { createNarrateAgent } from "../../src/agents/narrate-agent";

describe("createNarrateAgent", () => {
  it("calls provider with narrate schema", async () => {
    const provider = {
      generateStructured: vi.fn().mockResolvedValue({
        narration_text: "You cannot do that."
      })
    };

    const agent = createNarrateAgent(provider as never);
    const out = await agent.run({
      verdict: "reject",
      reason_code: "MISSING_PREREQ",
      safe_hint: "action_rejected"
    });

    expect(provider.generateStructured).toHaveBeenCalledWith(
      expect.objectContaining({ task: "narrate", schemaName: "NarrateOutput" })
    );
    expect(out.narration_text).toBe("You cannot do that.");
  });
});
