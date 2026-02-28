import { buildJudgeContext } from "../context/build-judge-context";
import type { JudgeContext } from "../context/build-judge-context";
import type { NarrateContext } from "../context/build-narrate-context";
import { runTurn } from "./pipeline";

export async function runLiveTurn(input: {
  rawInputText: string;
  state: Record<string, unknown>;
  judgeAgent: { run: (ctx: JudgeContext) => Promise<unknown> };
  narrateAgent: { run: (ctx: NarrateContext) => Promise<unknown> };
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
