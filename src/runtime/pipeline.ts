import { JudgeOutputSchema } from "../contracts/judge";
import { NarrateOutputSchema } from "../contracts/narrate";
import { SYSTEM_ERROR_CODES } from "../contracts/system-errors";
import { buildNarrateContext } from "../context/build-narrate-context";
import { processCommit } from "./commit";
import { CONFIDENCE_THRESHOLD, shouldRetryJudge } from "./retry-policy";
import { ZodError } from "zod";

function systemFallback(
  state: Record<string, unknown>,
  system_error_code: string
) {
  return {
    narration_text: "System busy, please try again.",
    state,
    system_error_code
  };
}

export async function runTurn(deps: {
  judge: () => Promise<unknown>;
  narrate: (ctx: unknown) => Promise<unknown>;
  state: Record<string, unknown>;
}) {
  let attempt = 0;
  let judgeResult: ReturnType<typeof JudgeOutputSchema.parse> | null = null;

  while (judgeResult === null) {
    try {
      const candidate = JudgeOutputSchema.parse(await deps.judge());
      const needRetry = shouldRetryJudge({
        confidence: candidate.confidence,
        schemaValid: true,
        attempt
      });

      if (needRetry) {
        attempt += 1;
        continue;
      }

      if (candidate.confidence < CONFIDENCE_THRESHOLD) {
        return systemFallback(deps.state, SYSTEM_ERROR_CODES.JUDGE_LOW_CONFIDENCE);
      }

      judgeResult = candidate;
    } catch (error) {
      const needRetry = shouldRetryJudge({
        confidence: 0,
        schemaValid: false,
        attempt
      });

      if (needRetry) {
        attempt += 1;
        continue;
      }

      if (error instanceof ZodError) {
        return systemFallback(deps.state, SYSTEM_ERROR_CODES.JUDGE_SCHEMA_INVALID);
      }

      return systemFallback(deps.state, SYSTEM_ERROR_CODES.JUDGE_CALL_FAILED);
    }
  }

  const commitResult = processCommit(judgeResult, deps.state);
  const narrateContext = buildNarrateContext(judgeResult);

  try {
    const narrateResult = NarrateOutputSchema.parse(await deps.narrate(narrateContext));
    return {
      ...narrateResult,
      state: commitResult.newState
    };
  } catch (error) {
    if (error instanceof ZodError) {
      return systemFallback(commitResult.newState, SYSTEM_ERROR_CODES.NARRATE_SCHEMA_INVALID);
    }

    return systemFallback(commitResult.newState, SYSTEM_ERROR_CODES.NARRATE_CALL_FAILED);
  }
}
