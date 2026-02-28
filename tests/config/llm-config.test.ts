import { beforeEach, describe, expect, it } from "vitest";
import { loadLlmConfig } from "../../src/config/llm";

describe("loadLlmConfig", () => {
  beforeEach(() => {
    delete process.env.LLM_BASE_URL;
    delete process.env.LLM_API_KEY;
    delete process.env.LLM_MODEL;
  });

  it("throws when required env vars are missing", () => {
    expect(() => loadLlmConfig()).toThrow(/LLM_BASE_URL/);
  });

  it("returns typed config when all env vars are set", () => {
    process.env.LLM_BASE_URL = "https://example.com/v1";
    process.env.LLM_API_KEY = "test-key";
    process.env.LLM_MODEL = "test-model";

    expect(loadLlmConfig()).toEqual({
      baseUrl: "https://example.com/v1",
      apiKey: "test-key",
      model: "test-model"
    });
  });
});
