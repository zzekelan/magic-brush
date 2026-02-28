import { ZodError } from "zod";
import { JudgeOutputSchema } from "../contracts/judge";
import { NarrateOutputSchema } from "../contracts/narrate";
import { SYSTEM_ERROR_CODES } from "../contracts/system-errors";
import { buildNarrateContext, type NarrateContext } from "../context/build-narrate-context";
import { commitApprovedState } from "./commit";
import { CONFIDENCE_THRESHOLD, shouldRetryJudge } from "./retry-policy";

export type TurnResult = {
  narration_text: string;
  reference: string;
  state: Record<string, unknown>;
  system_error_code?: string;
};

function systemFallback(
  state: Record<string, unknown>,
  systemErrorCode: string
): TurnResult {
  return {
    narration_text: "System busy, please try again.",
    reference: "Try again with a different action in a moment.",
    state,
    system_error_code: systemErrorCode
  };
}

function readNarrationHistory(state: Record<string, unknown>): string[] {
  const raw = state.narration_history;
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.filter((item): item is string => typeof item === "string");
}

export async function runTurn(deps: {
  judge: () => Promise<unknown>;
  narrate: (ctx: NarrateContext) => Promise<unknown>;
  state: Record<string, unknown>;
}): Promise<TurnResult> {
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

  const narrateContext = buildNarrateContext({
    judge: judgeResult,
    narrationHistory: readNarrationHistory(deps.state)
  });

  try {
    const narrateResult = NarrateOutputSchema.parse(await deps.narrate(narrateContext));
    const nextState =
      judgeResult.verdict === "approve"
        ? commitApprovedState({
            state: deps.state,
            statePatch: judgeResult.state_patch,
            narrationText: narrateResult.narration_text
          })
        : deps.state;

    return {
      ...narrateResult,
      state: nextState
    };
  } catch (error) {
    if (error instanceof ZodError) {
      return systemFallback(deps.state, SYSTEM_ERROR_CODES.NARRATE_SCHEMA_INVALID);
    }

    return systemFallback(deps.state, SYSTEM_ERROR_CODES.NARRATE_CALL_FAILED);
  }
}
