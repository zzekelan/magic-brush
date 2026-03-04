import { describe, expect, it, vi } from "vitest";
import { createLiveTurnExecutor } from "../../src/runtime/create-live-turn-executor";

describe("createLiveTurnExecutor", () => {
  it("builds agents once and forwards turn args", async () => {
    const loadLlmConfig = vi.fn().mockReturnValue({
      baseUrl: "http://x",
      apiKey: "k",
      model: "m",
      timeoutMs: 1000
    });
    const createProvider = vi.fn().mockReturnValue({});
    const judgeAgent = { run: vi.fn() };
    const narrateAgent = { run: vi.fn() };
    const createJudgeAgent = vi.fn().mockReturnValue(judgeAgent);
    const createNarrateAgent = vi.fn().mockReturnValue(narrateAgent);
    const runLiveTurnImpl = vi
      .fn()
      .mockResolvedValue({ narration_text: "n", reference: "r", state: {} });

    const exec = createLiveTurnExecutor({
      loadLlmConfig,
      createProvider,
      createJudgeAgent,
      createNarrateAgent,
      runLiveTurnImpl
    });

    await exec({ rawInputText: "look", state: { x: 1 }, debug: true });

    expect(loadLlmConfig).toHaveBeenCalledTimes(1);
    expect(createProvider).toHaveBeenCalledTimes(1);
    expect(runLiveTurnImpl).toHaveBeenCalledWith({
      rawInputText: "look",
      state: { x: 1 },
      debug: true,
      judgeAgent,
      narrateAgent
    });
  });
});
