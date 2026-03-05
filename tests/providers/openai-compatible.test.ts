import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { OpenAICompatibleProvider } from "../../src/providers/openai-compatible";

describe("OpenAICompatibleProvider", () => {
  it("routes task temperature and extracts usage tokens", async () => {
    const create = vi.fn().mockResolvedValue({
      choices: [{ message: { content: "{\"ok\":true}" } }],
      usage: { total_tokens: 42 }
    });

    const provider = new OpenAICompatibleProvider({
      model: "test-model",
      createCompletion: create,
      judgeTemperature: 0,
      narrateTemperature: 1
    });

    const out = await provider.generateStructured({
      task: "judge",
      schemaName: "JudgeOutput",
      schema: z.object({ ok: z.boolean() }),
      messages: [{ role: "user", content: "test" }]
    });

    expect(out.data).toEqual({ ok: true });
    expect(out.usage_total_tokens).toBe(42);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "test-model",
        temperature: 0,
        response_format: expect.objectContaining({
          type: "json_schema"
        })
      })
    );
  });

  it("falls back usage_total_tokens to 0 when provider usage metadata is absent", async () => {
    const create = vi.fn().mockResolvedValue({
      choices: [{ message: { content: "{\"narration_text\":\"ok\"}" } }]
    });

    const provider = new OpenAICompatibleProvider({
      model: "test-model",
      createCompletion: create,
      judgeTemperature: 0,
      narrateTemperature: 1
    });

    const out = await provider.generateStructured({
      task: "narrate",
      schemaName: "NarrateOutput",
      schema: z.object({ narration_text: z.string() }),
      messages: [{ role: "user", content: "test" }]
    });

    expect(create).toHaveBeenCalledWith(expect.objectContaining({ temperature: 1 }));
    expect(out.data).toEqual({ narration_text: "ok" });
    expect(out.usage_total_tokens).toBe(0);
  });

  it("fails fast when completion call exceeds timeout", async () => {
    const create = vi.fn().mockImplementation(
      () =>
        new Promise(() => {
          // never resolves
        })
    );

    const provider = new OpenAICompatibleProvider({
      model: "test-model",
      createCompletion: create,
      requestTimeoutMs: 10
    });

    await expect(
      provider.generateStructured({
        task: "narrate",
        schemaName: "NarrateOutput",
        schema: z.object({ narration_text: z.string() }),
        messages: [{ role: "user", content: "test" }]
      })
    ).rejects.toThrow(/timed out/i);
  });

  it("clears timeout timer after successful completion", async () => {
    const timerApi = {
      setTimeout: vi.fn().mockReturnValue(123),
      clearTimeout: vi.fn()
    };
    const create = vi.fn().mockResolvedValue({
      choices: [{ message: { content: "{\"narration_text\":\"ok\"}" } }]
    });

    const provider = new OpenAICompatibleProvider({
      model: "test-model",
      createCompletion: create,
      requestTimeoutMs: 999,
      timerApi
    });

    await provider.generateStructured({
      task: "narrate",
      schemaName: "NarrateOutput",
      schema: z.object({ narration_text: z.string() }),
      messages: [{ role: "user", content: "test" }]
    });

    expect(timerApi.setTimeout).toHaveBeenCalledTimes(1);
    expect(timerApi.clearTimeout).toHaveBeenCalledWith(123);
  });
});
