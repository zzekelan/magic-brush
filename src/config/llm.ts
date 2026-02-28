export type LlmConfig = {
  baseUrl: string;
  apiKey: string;
  model: string;
};

function requireEnv(name: "LLM_BASE_URL" | "LLM_API_KEY" | "LLM_MODEL"): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value.trim();
}

export function loadLlmConfig(): LlmConfig {
  return {
    baseUrl: requireEnv("LLM_BASE_URL"),
    apiKey: requireEnv("LLM_API_KEY"),
    model: requireEnv("LLM_MODEL")
  };
}
