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
      raw_input_text: "open gate",
      verdict: "reject",
      reason_code: "MISSING_PREREQ",
      ref_from_judge: "Find a torch first.",
      state_snapshot: { approved_interaction_history: [] }
    });

    const call = provider.generateStructured.mock.calls[0][0];
    expect(call.messages[0].content).toContain("reference");
    expect(call.messages[0].content).toContain("json object");
    expect(call.messages[0].content).toContain("raw_input_text");
    expect(call.messages[0].content).toContain("state_snapshot");
    expect(call.messages[0].content).toContain("conversation_context");
    expect(call.messages[0].content).toContain("state_snapshot.onboarding");
    expect(call.messages[0].content).toContain("completed");
    expect(call.messages[0].content).toContain("role_profile");
    expect(call.messages[0].content).toContain("world_background");
    expect(call.messages[0].content).toContain("Follow the same language as the player's raw_input_text.");
    expect(call.messages[0].content).toContain("Do not include any keys outside the schema");
    expect(call.messages[0].content).toContain(
      "Do not treat rejected entries as world facts."
    );
    expect(call.messages[0].content).toContain(
      "Do not output policy-review wording"
    );
  });
});
