import "dotenv/config";
import { stdin as input, stdout as output } from "node:process";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";
import { parseReplArgs } from "./parse-cli-args";
import {
  applyOnboardingInput,
  applyReplCommand,
  formatReplRender,
  getOnboardingPrompt,
  isOnboardingComplete,
  shouldExit
} from "./repl-session";
import { createLiveTurnExecutor } from "../runtime/create-live-turn-executor";

type ReplTurnOutput = {
  narration_text: string;
  reference: string;
  state: Record<string, unknown>;
  [key: string]: unknown;
};

export async function runReplSession(input: {
  debug: boolean;
  ask: (prompt: string) => Promise<string>;
  print: (line: string) => void;
  runTurn: (args: {
    rawInputText: string;
    debug: boolean;
    state: Record<string, unknown>;
  }) => Promise<ReplTurnOutput>;
}) {
  const { debug } = input;
  let state: Record<string, unknown> = {};

  for (;;) {
    if (!isOnboardingComplete(state)) {
      input.print(
        formatReplRender(
          { kind: "onboarding_prompt", text: getOnboardingPrompt(state) },
          debug
        )
      );
    }

    const rawInput = await input.ask("> ");
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
      input.print(
        formatReplRender(
          {
            kind: "system_ack",
            text: "Session state reset.\n会话已重置。"
          },
          debug
        )
      );
      continue;
    }

    if (!isOnboardingComplete(state)) {
      const onboarding = applyOnboardingInput(text, state);
      state = onboarding.state;
      input.print(
        formatReplRender(
          {
            kind: "onboarding_ack",
            text: onboarding.message
          },
          debug
        )
      );
      continue;
    }

    const out = await input.runTurn({
      rawInputText: text,
      debug,
      state
    });
    input.print(formatReplRender({ kind: "turn_result", output: out }, debug));
    state = out.state;
  }
}

async function main() {
  const { debug } = parseReplArgs(process.argv.slice(2));
  const runTurnExecutor = createLiveTurnExecutor();
  const rl = createInterface({ input, output });

  try {
    await runReplSession({
      debug,
      ask: (prompt) => rl.question(prompt),
      print: (line) => console.log(line),
      runTurn: ({ rawInputText, debug: turnDebug, state }) =>
        runTurnExecutor({
          rawInputText,
          debug: turnDebug,
          state
        })
    });
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
