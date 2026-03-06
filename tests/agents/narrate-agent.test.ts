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
    expect(call.messages[0].content).toContain("state_snapshot.completed_turn_count");
    expect(call.messages[0].content).toContain("state_snapshot.current_turn_index");
    expect(call.messages[0].content).toContain("conversation_context");
    expect(call.messages[0].content).toContain("state_snapshot.onboarding");
    expect(call.messages[0].content).toContain("completed");
    expect(call.messages[0].content).toContain("role_profile");
    expect(call.messages[0].content).toContain("world_background");
    expect(call.messages[0].content).toContain("in-world next-step hint in second person");
    expect(call.messages[0].content).toContain(
      "Keep both narration_text and reference immersive and in-world."
    );
    expect(call.messages[0].content).toContain("Avoid out-of-world meta wording.");
    expect(call.messages[0].content).toContain("Follow the same language as raw_input_text.");
    expect(call.messages[0].content).toContain("Do not include any keys outside the schema");
    expect(call.messages[0].content).toContain("When current_turn_index <= 2");
    expect(call.messages[0].content).toContain("low-information input");
    expect(call.messages[0].content).toContain(
      "narration_text must naturally include actionable directions"
    );
    expect(call.messages[0].content).toContain(
      "reference must provide 2-4 concise executable options"
    );
    expect(call.messages[0].content).toContain(
      "Complete only the minimum local detail needed for this turn."
    );
    expect(call.messages[0].content).toContain(
      "Prefer scene-level detail over major lore expansion."
    );
    expect(call.messages[0].content).toContain(
      "Do not invent major canon unless required by existing facts."
    );
    expect(call.messages[0].content).toContain(
      "Do not grant the player major status, power, or destiny unless already established."
    );
    expect(call.messages[0].content).toContain(
      "Do not treat rejected entries as world facts."
    );
    expect(call.messages[0].content).toContain(
      "Do not output policy-review wording"
    );
  });

  it("adds strong narration_text length constraints for chinese and english outputs", async () => {
    const provider = {
      generateStructured: vi.fn().mockResolvedValue({
        narration_text: "You step into the corridor.",
        reference: "Try lighting a torch before entering the tunnel."
      })
    };

    const agent = createNarrateAgent(provider as never);
    await agent.run({
      raw_input_text: "look around",
      verdict: "approve",
      reason_code: "APPROVED",
      ref_from_judge: "Inspect the corridor.",
      state_snapshot: { approved_interaction_history: [] }
    });

    const call = provider.generateStructured.mock.calls[0][0];
    expect(call.messages[0].content).toContain(
      "This constraint applies to narration_text only, not reference."
    );
    expect(call.messages[0].content).toContain(
      "If narration_text is in Chinese, keep it within about 150 Chinese characters and do not clearly exceed that length."
    );
    expect(call.messages[0].content).toContain(
      "If narration_text is in English, keep it within about 70 words and do not clearly exceed that length."
    );
  });

  it("adds an early-turn positive greeting rule for low-information input", async () => {
    const provider = {
      generateStructured: vi.fn().mockResolvedValue({
        narration_text: "A warm breeze carries your greeting through the square.",
        reference: "Wave to the nearest stall keeper."
      })
    };

    const agent = createNarrateAgent(provider as never);
    await agent.run({
      raw_input_text: "hello",
      verdict: "approve",
      reason_code: "APPROVED",
      ref_from_judge: "Wave toward the market stalls.",
      state_snapshot: { approved_interaction_history: [] }
    });

    const call = provider.generateStructured.mock.calls[0][0];
    expect(call.messages[0].content).toContain(
      "When current_turn_index <= 2 and low-information input is a greeting such as \"hello\", \"hello, world!\", \"你好\", or \"你好，世界！\","
    );
    expect(call.messages[0].content).toContain(
      "narration_text should respond positively and welcomingly in-world."
    );
    expect(call.messages[0].content).toContain(
      "reference should stay positive and invite an immediate next action."
    );
    expect(call.messages[0].content).toContain(
      "When reason_code is APPROVED, treat ref_from_judge as positive scene guidance."
    );
  });
});
