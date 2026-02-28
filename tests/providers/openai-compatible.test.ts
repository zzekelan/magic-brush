import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { OpenAICompatibleProvider } from "../../src/providers/openai-compatible";

describe("OpenAICompatibleProvider", () => {
  it("requests strict json_schema and parses output", async () => {
    const create = vi.fn().mockResolvedValue({
      choices: [{ message: { content: "{\"narration_text\":\"ok\"}" } }]
    });

    const provider = new OpenAICompatibleProvider({
      model: "test-model",
      createCompletion: create
    });

    const out = await provider.generateStructured({
      task: "narrate",
      schemaName: "NarrateOutput",
      schema: z.object({ narration_text: z.string() }),
      messages: [{ role: "user", content: "test" }]
    });

    expect(out).toEqual({ narration_text: "ok" });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "test-model",
        response_format: expect.objectContaining({
          type: "json_schema"
        })
      })
    );
  });
});
