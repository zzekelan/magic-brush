import { beforeEach, describe, expect, it } from "vitest";
import { loadLlmConfig } from "../../src/config/llm";

describe("loadLlmConfig", () => {
  beforeEach(() => {
    delete process.env.LLM_BASE_URL;
    delete process.env.LLM_API_KEY;
    delete process.env.LLM_MODEL;
    delete process.env.LLM_TIMEOUT_MS;
  });

  it("throws when required env vars are missing", () => {
    expect(() => loadLlmConfig()).toThrow(/LLM_BASE_URL/);
  });

  it("returns typed config when all env vars are set", () => {
    process.env.LLM_BASE_URL = "https://example.com/v1";
    process.env.LLM_API_KEY = "test-key";
    process.env.LLM_MODEL = "test-model";
    process.env.LLM_TIMEOUT_MS = "15000";

    expect(loadLlmConfig()).toEqual({
      baseUrl: "https://example.com/v1",
      apiKey: "test-key",
      model: "test-model",
      timeoutMs: 15000
    });
  });

  it("uses default timeout when optional timeout is missing", () => {
    process.env.LLM_BASE_URL = "https://example.com/v1";
    process.env.LLM_API_KEY = "test-key";
    process.env.LLM_MODEL = "test-model";

    expect(loadLlmConfig()).toEqual({
      baseUrl: "https://example.com/v1",
      apiKey: "test-key",
      model: "test-model",
      timeoutMs: 30000
    });
  });
});
