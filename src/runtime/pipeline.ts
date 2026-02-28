import { JudgeOutputSchema } from "../contracts/judge";
import { NarrateOutputSchema } from "../contracts/narrate";
import { SYSTEM_ERROR_CODES } from "../contracts/system-errors";
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

  try {
    const narrateResult = NarrateOutputSchema.parse(await deps.narrate(narrateContext));
    return {
      ...narrateResult,
      state: commitResult.newState
    };
  } catch {
    return {
      narration_text: "System busy, Please try again.",
      state: commitResult.newState,
      system_error_code: SYSTEM_ERROR_CODES.NARRATE_SCHEMA_INVALID
    };
  }
}
