export type LlmConfig = {
  baseUrl: string;
  apiKey: string;
  model: string;
  timeoutMs: number;
  judgeTemperature: number;
  narrateTemperature: number;
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

type TempEnvName = "LLM_JUDGE_TEMPERATURE" | "LLM_NARRATE_TEMPERATURE";

function readTemperature(name: TempEnvName, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) {
    return fallback;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 2) {
    throw new Error(`Invalid ${name}: must be a number in [0, 2].`);
  }

  return parsed;
}

export function loadLlmConfig(): LlmConfig {
  return {
    baseUrl: requireEnv("LLM_BASE_URL"),
    apiKey: requireEnv("LLM_API_KEY"),
    model: requireEnv("LLM_MODEL"),
    timeoutMs: readTimeoutMs(),
    judgeTemperature: readTemperature("LLM_JUDGE_TEMPERATURE", 0),
    narrateTemperature: readTemperature("LLM_NARRATE_TEMPERATURE", 1)
  };
}
