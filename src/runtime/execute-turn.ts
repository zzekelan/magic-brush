import { buildJudgeContext } from "../context/build-judge-context";
import type { JudgeContext } from "../context/build-judge-context";
import type { NarrateContext } from "../context/build-narrate-context";
import { buildRuntimeStateSnapshot, normalizePersistedState } from "./normalize-state";
import { runTurnPipeline } from "./pipeline";

export async function executeTurn(input: {
  rawInputText: string;
  debug?: boolean;
  judgeTemperature?: number;
  narrateTemperature?: number;
  state: Record<string, unknown>;
  judgeAgent: { run: (ctx: JudgeContext) => Promise<unknown> };
  narrateAgent: { run: (ctx: NarrateContext) => Promise<unknown> };
}) {
  const persistedState = normalizePersistedState(input.state);
  const runtimeStateSnapshot = buildRuntimeStateSnapshot(persistedState);
  const judgeContext = buildJudgeContext({
    rawInputText: input.rawInputText,
    state: runtimeStateSnapshot
  });

  return runTurnPipeline({
    rawInputText: input.rawInputText,
    debug: input.debug,
    judge: () => input.judgeAgent.run(judgeContext),
    narrate: (ctx) => input.narrateAgent.run(ctx),
    state: persistedState,
    judgeTemperature: input.judgeTemperature,
    narrateTemperature: input.narrateTemperature
  });
}
