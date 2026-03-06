import { describe, expect, it, vi } from "vitest";
import { createLiveTurnExecutor } from "../../src/runtime/create-live-turn-executor";

describe("createLiveTurnExecutor", () => {
  it("builds agents once and forwards executeTurn/executeJudge args", async () => {
    const loadLlmConfig = vi.fn().mockReturnValue({
      baseUrl: "http://x",
      apiKey: "k",
      model: "m",
      timeoutMs: 1000,
      judgeTemperature: 0.25,
      narrateTemperature: 1.15
    });
    const createProvider = vi.fn().mockReturnValue({});
    const judgeAgent = { run: vi.fn() };
    const narrateAgent = { run: vi.fn() };
    const createJudgeAgent = vi.fn().mockReturnValue(judgeAgent);
    const createNarrateAgent = vi.fn().mockReturnValue(narrateAgent);
    const executeTurnImpl = vi
      .fn()
      .mockResolvedValue({ narration_text: "n", reference: "r", state: {} });
    const executeJudgeImpl = vi.fn().mockResolvedValue({
      ok: true,
      output: {
        verdict: "reject",
        reason_code: "MISSING_PREREQ",
        internal_reason: "x",
        confidence: 0.9,
        ref_from_judge: "补充主要势力。"
      },
      usage_total_tokens: 12
    });

    const exec = createLiveTurnExecutor({
      loadLlmConfig,
      createProvider,
      createJudgeAgent,
      createNarrateAgent,
      executeTurnImpl,
      executeJudgeImpl
    });

    await exec.executeTurn({ rawInputText: "look", state: { x: 1 }, debug: true });
    await exec.executeJudge({ rawInputText: "world setup", state: { x: 1 } });

    expect(loadLlmConfig).toHaveBeenCalledTimes(1);
    expect(createProvider).toHaveBeenCalledWith(
      expect.objectContaining({ judgeTemperature: 0.25, narrateTemperature: 1.15 })
    );
    expect(executeTurnImpl).toHaveBeenCalledWith({
      rawInputText: "look",
      state: { x: 1 },
      debug: true,
      judgeTemperature: 0.25,
      narrateTemperature: 1.15,
      judgeAgent,
      narrateAgent
    });
    expect(executeJudgeImpl).toHaveBeenCalledWith({
      rawInputText: "world setup",
      state: { x: 1 },
      judgeAgent
    });
  });
});
