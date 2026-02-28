import { buildJudgeContext } from "../context/build-judge-context";
import { runTurn } from "./pipeline";

export async function runLiveTurn(input: {
  rawInputText: string;
  state: Record<string, unknown>;
  judgeAgent: { run: (ctx: unknown) => Promise<unknown> };
  narrateAgent: { run: (ctx: unknown) => Promise<unknown> };
}) {
  const judgeContext = buildJudgeContext({
    rawInputText: input.rawInputText,
    state: input.state
  });

  return runTurn({
    judge: () => input.judgeAgent.run(judgeContext),
    narrate: (ctx) => input.narrateAgent.run(ctx),
    state: input.state
  });
}
