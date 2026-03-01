import "dotenv/config";
import { fileURLToPath } from "node:url";
import { createJudgeAgent } from "../agents/judge-agent";
import { createNarrateAgent } from "../agents/narrate-agent";
import { loadLlmConfig } from "../config/llm";
import { OpenAICompatibleProvider } from "../providers/openai-compatible";
import { runLiveTurn } from "../runtime/run-live-turn";
import { parseTurnArgs } from "./parse-cli-args";

async function main() {
  const { rawInputText, debug } = parseTurnArgs(process.argv.slice(2));
  const config = loadLlmConfig();
  const provider = OpenAICompatibleProvider.fromConfig({
    baseUrl: config.baseUrl,
    apiKey: config.apiKey,
    model: config.model,
    timeoutMs: config.timeoutMs
  });
  const judgeAgent = createJudgeAgent(provider);
  const narrateAgent = createNarrateAgent(provider);

  const out = await runLiveTurn({
    rawInputText,
    debug,
    state: {},
    judgeAgent,
    narrateAgent
  });

  console.log(JSON.stringify(out, null, 2));
}

function isMainModule() {
  const entry = process.argv[1];
  if (!entry) {
    return false;
  }

  return fileURLToPath(import.meta.url) === entry;
}

if (isMainModule()) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exit(1);
  });
}
