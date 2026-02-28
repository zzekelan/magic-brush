import { JudgeOutputSchema } from "../contracts/judge";
import { NarrateOutputSchema } from "../contracts/narrate";
import { processCommit } from "./commit";
import { toNarrateContext } from "./to-narrate-context";

export async function runTurn(deps: {
  judge: () => Promise<unknown>;
  narrate: (ctx: unknown) => Promise<unknown>;
  state: Record<string, unknown>;
}) {
  const judgeResult = JudgeOutputSchema.parse(await deps.judge());
  const commitResult = processCommit(judgeResult, deps.state);
  const narrateContext = toNarrateContext(judgeResult);
  const narrateResult = NarrateOutputSchema.parse(await deps.narrate(narrateContext));

  return {
    ...narrateResult,
    state: commitResult.newState
  };
}
