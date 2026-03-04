import "dotenv/config";
import { stdin as input, stdout as output } from "node:process";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";
import { parseReplArgs } from "./parse-cli-args";
import {
  formatReplRender,
  getOnboardingPrompt,
  isOnboardingComplete
} from "./repl-session";
import { createLiveTurnExecutor } from "../runtime/create-live-turn-executor";
import { toReplRender } from "../interaction/repl-render";
import { stepInteraction } from "../interaction/step-engine";

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

    const step = await stepInteraction({
      rawInputText: text,
      debug,
      state,
      runTurn: input.runTurn
    });

    if (step.kind === "exit") {
      break;
    }

    state = step.nextState;

    if (step.kind === "noop") {
      continue;
    }

    const render = toReplRender(step);
    if (render) {
      input.print(formatReplRender(render, debug));
    }
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
