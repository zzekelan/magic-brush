export type LlmConfig = {
  baseUrl: string;
  apiKey: string;
  model: string;
  timeoutMs: number;
};

function requireEnv(name: "LLM_BASE_URL" | "LLM_API_KEY" | "LLM_MODEL"): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value.trim();
}

function readTimeoutMs(): number {
  const raw = process.env.LLM_TIMEOUT_MS?.trim();
  if (!raw) {
    return 30000;
  }

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error("Invalid LLM_TIMEOUT_MS: must be a positive integer.");
  }

  return parsed;
}

export function loadLlmConfig(): LlmConfig {
  return {
    baseUrl: requireEnv("LLM_BASE_URL"),
    apiKey: requireEnv("LLM_API_KEY"),
    model: requireEnv("LLM_MODEL"),
    timeoutMs: readTimeoutMs()
  };
}
