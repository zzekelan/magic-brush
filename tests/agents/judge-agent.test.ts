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
      state_snapshot: {},
      narration_history: []
    });

    const call = provider.generateStructured.mock.calls[0][0];
    expect(call.messages[0].content).toContain("ref_from_judge");
    expect(call.messages[0].content).toContain("state_patch");
    expect(call.messages[0].content).toContain("json object");
    expect(call.messages[0].content).toContain("RULE_CONFLICT");
    expect(call.messages[0].content).toContain("MISSING_PREREQ");
    expect(call.messages[0].content).toContain("OUT_OF_SCOPE_ACTION");
    expect(call.messages[0].content).toContain("SAFETY_BLOCKED");
    expect(call.messages[0].content).toContain("must never be null");
    expect(call.messages[0].content).toContain("omit this key entirely");
  });
});
