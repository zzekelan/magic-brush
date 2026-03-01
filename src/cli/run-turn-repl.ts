import "dotenv/config";
import { stdin as input, stdout as output } from "node:process";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";
import { createJudgeAgent } from "../agents/judge-agent";
import { createNarrateAgent } from "../agents/narrate-agent";
import { loadLlmConfig } from "../config/llm";
import { OpenAICompatibleProvider } from "../providers/openai-compatible";
import { runLiveTurn } from "../runtime/run-live-turn";
import { applyReplCommand, shouldExit } from "./repl-session";

async function main() {
  const config = loadLlmConfig();
  const provider = OpenAICompatibleProvider.fromConfig({
    baseUrl: config.baseUrl,
    apiKey: config.apiKey,
    model: config.model,
    timeoutMs: config.timeoutMs
  });

  const judgeAgent = createJudgeAgent(provider);
  const narrateAgent = createNarrateAgent(provider);
  const rl = createInterface({ input, output });
  let state: Record<string, unknown> = {};

  try {
    for (;;) {
      const rawInput = await rl.question("> ");
      const text = rawInput.trim();
      if (!text) {
        continue;
      }

      if (shouldExit(text)) {
        break;
      }

      const nextStateFromCommand = applyReplCommand(text, state);
      if (nextStateFromCommand !== state) {
        state = nextStateFromCommand;
        console.log(
          JSON.stringify(
            {
              narration_text: "Session state reset.",
              reference: "Enter your next action.",
              state
            },
            null,
            2
          )
        );
        continue;
      }

      const out = await runLiveTurn({
        rawInputText: text,
        state,
        judgeAgent,
        narrateAgent
      });
      console.log(JSON.stringify(out, null, 2));
      state = out.state;
    }
  } finally {
    rl.close();
  }
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
