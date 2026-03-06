import { describe, expect, it, vi } from "vitest";
import { createJudgeAgent } from "../../src/agents/judge-agent";

describe("createJudgeAgent", () => {
  it("sends prompt instructions describing required judge output fields", async () => {
    const provider = {
      generateStructured: vi.fn().mockResolvedValue({
        verdict: "reject",
        reason_code: "MISSING_PREREQ",
        internal_reason: "x",
        confidence: 0.9,
        ref_from_judge: "Search the room first."
      })
    };

    const agent = createJudgeAgent(provider as never);
    await agent.run({
      raw_input_text: "look",
      state_snapshot: {}
    });

    const call = provider.generateStructured.mock.calls[0][0];
    expect(call.messages[0].content).toContain("ref_from_judge");
    expect(call.messages[0].content).not.toContain("narration_history");
    expect(call.messages[0].content).not.toContain("state_patch");
    expect(call.messages[0].content).toContain("json object");
    expect(call.messages[0].content).toContain("RULE_CONFLICT");
    expect(call.messages[0].content).toContain("MISSING_PREREQ");
    expect(call.messages[0].content).toContain("OUT_OF_SCOPE_ACTION");
    expect(call.messages[0].content).toContain("SAFETY_BLOCKED");
    expect(call.messages[0].content).toContain("APPROVED");
    expect(call.messages[0].content).toContain("number in [0, 1]");
    expect(call.messages[0].content).toContain("state_snapshot.onboarding");
    expect(call.messages[0].content).toContain("state_snapshot.completed_turn_count");
    expect(call.messages[0].content).toContain("state_snapshot.current_turn_index");
    expect(call.messages[0].content).toContain("completed");
    expect(call.messages[0].content).toContain("Do not reject only because world detail is sparse.");
    expect(call.messages[0].content).toContain("Unknown local detail should usually remain playable.");
    expect(call.messages[0].content).toContain(
      "Reject only for direct contradiction, unfillable prerequisite, or safety risk."
    );
    expect(call.messages[0].content).toContain(
      "Prefer a minimal in-world interpretation that keeps the turn playable."
    );
    expect(call.messages[0].content).not.toContain("Onboarding world background gating rule");
    expect(call.messages[0].content).toContain("role_profile");
    expect(call.messages[0].content).toContain("world_background");
    expect(call.messages[0].content).toContain("current_turn_index <= 2");
    expect(call.messages[0].content).toContain("prefer approve");
    expect(call.messages[0].content).toContain(
      "When verdict is approve, reason_code must be APPROVED."
    );
    expect(call.messages[0].content).toContain("If verdict is reject");
    expect(call.messages[0].content).toContain(
      "concrete, immediately executable next action"
    );
    expect(call.messages[0].content).toContain("in-world guidance sentence in second person");
    expect(call.messages[0].content).toContain("Use immersive in-world language only.");
    expect(call.messages[0].content).toContain("Avoid out-of-world meta wording.");
    expect(call.messages[0].content).toContain("Follow the same language as raw_input_text.");
    expect(call.messages[0].content).toContain("Do not include any keys outside the schema");
  });

  it("adds an early-turn positive greeting rule for low-information input", async () => {
    const provider = {
      generateStructured: vi.fn().mockResolvedValue({
        verdict: "approve",
        reason_code: "APPROVED",
        internal_reason: "x",
        confidence: 0.9,
        ref_from_judge: "Step into the lantern-lit market."
      })
    };

    const agent = createJudgeAgent(provider as never);
    await agent.run({
      raw_input_text: "hello",
      state_snapshot: {}
    });

    const call = provider.generateStructured.mock.calls[0][0];
    expect(call.messages[0].content).toContain(
      "When current_turn_index <= 2 and low-information input is a greeting such as \"hello\", \"hello, world!\", \"你好\", or \"你好，世界！\", prefer approve."
    );
    expect(call.messages[0].content).toContain(
      "For these greetings, keep ref_from_judge positive, welcoming, and immediately actionable."
    );
  });
});
