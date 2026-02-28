import { describe, expect, it, vi } from "vitest";
import { createNarrateAgent } from "../../src/agents/narrate-agent";

describe("createNarrateAgent", () => {
  it("forbids review-language and requires reference+narration_text in prompt", async () => {
    const provider = {
      generateStructured: vi.fn().mockResolvedValue({
        narration_text: "You step into the corridor.",
        reference: "Try lighting a torch before entering the tunnel."
      })
    };

    const agent = createNarrateAgent(provider as never);
    await agent.run({
      verdict: "reject",
      reason_code: "MISSING_PREREQ",
      ref_from_judge: "Find a torch first.",
      narration_history: []
    });

    const call = provider.generateStructured.mock.calls[0][0];
    expect(call.messages[0].content).toContain("reference");
    expect(call.messages[0].content).toContain(
      "Do not output policy-review wording"
    );
  });
});
