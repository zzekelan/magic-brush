import { describe, expect, it, vi } from "vitest";
import { createJudgeAgent } from "../../src/agents/judge-agent";

describe("createJudgeAgent", () => {
  it("calls provider with judge schema", async () => {
    const provider = {
      generateStructured: vi.fn().mockResolvedValue({
        verdict: "reject",
        reason_code: "MISSING_PREREQ",
        internal_reason: "x",
        confidence: 0.9
      })
    };

    const agent = createJudgeAgent(provider as never);
    const out = await agent.run({ raw_input_text: "look", state_snapshot: {} });

    expect(provider.generateStructured).toHaveBeenCalledWith(
      expect.objectContaining({ task: "judge", schemaName: "JudgeOutput" })
    );
    expect(out.verdict).toBe("reject");
  });
});
