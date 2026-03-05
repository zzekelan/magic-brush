import { beforeEach, describe, expect, it } from "vitest";
import { loadLlmConfig } from "../../src/config/llm";

describe("loadLlmConfig", () => {
  beforeEach(() => {
    delete process.env.LLM_BASE_URL;
    delete process.env.LLM_API_KEY;
    delete process.env.LLM_MODEL;
    delete process.env.LLM_TIMEOUT_MS;
    delete process.env.LLM_JUDGE_TEMPERATURE;
    delete process.env.LLM_NARRATE_TEMPERATURE;
  });

  it("throws when required env vars are missing", () => {
    expect(() => loadLlmConfig()).toThrow(/LLM_BASE_URL/);
  });

  it("returns typed config when all env vars are set", () => {
    process.env.LLM_BASE_URL = "https://example.com/v1";
    process.env.LLM_API_KEY = "test-key";
    process.env.LLM_MODEL = "test-model";
    process.env.LLM_TIMEOUT_MS = "15000";
    process.env.LLM_JUDGE_TEMPERATURE = "0.2";
    process.env.LLM_NARRATE_TEMPERATURE = "1.4";

    expect(loadLlmConfig()).toEqual({
      baseUrl: "https://example.com/v1",
      apiKey: "test-key",
      model: "test-model",
      timeoutMs: 15000,
      judgeTemperature: 0.2,
      narrateTemperature: 1.4
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
      timeoutMs: 30000,
      judgeTemperature: 0,
      narrateTemperature: 1
    });
  });

  it("uses default judge/narrate temperatures when env vars are missing", () => {
    process.env.LLM_BASE_URL = "https://example.com/v1";
    process.env.LLM_API_KEY = "test-key";
    process.env.LLM_MODEL = "test-model";

    expect(loadLlmConfig()).toEqual(
      expect.objectContaining({ judgeTemperature: 0, narrateTemperature: 1.0 })
    );
  });

  it("throws for invalid judge temperature values", () => {
    process.env.LLM_BASE_URL = "https://example.com/v1";
    process.env.LLM_API_KEY = "test-key";
    process.env.LLM_MODEL = "test-model";
    process.env.LLM_JUDGE_TEMPERATURE = "-0.1";

    expect(() => loadLlmConfig()).toThrow(/LLM_JUDGE_TEMPERATURE/);
  });

  it("throws for invalid narrate temperature values", () => {
    process.env.LLM_BASE_URL = "https://example.com/v1";
    process.env.LLM_API_KEY = "test-key";
    process.env.LLM_MODEL = "test-model";
    process.env.LLM_NARRATE_TEMPERATURE = "2.1";

    expect(() => loadLlmConfig()).toThrow(/LLM_NARRATE_TEMPERATURE/);
  });
});
