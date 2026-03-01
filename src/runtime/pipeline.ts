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
  system_error_detail?: string;
};

function systemFallback(
  state: Record<string, unknown>,
  systemErrorCode: string,
  systemErrorDetail?: string
): TurnResult {
  return {
    narration_text: "System busy, please try again.",
    reference: "Try again with a different action in a moment.",
    state,
    system_error_code: systemErrorCode,
    system_error_detail: systemErrorDetail
  };
}

function extractErrorDetail(error: unknown): string | undefined {
  if (typeof error === "string") {
    return error;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === "object") {
    try {
      return JSON.stringify(error);
    } catch {
      return "Unknown provider error object";
    }
  }

  return undefined;
}

function summarizeZodError(error: ZodError): string {
  return error.issues
    .slice(0, 5)
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "(root)";
      return `${path}: ${issue.message}`;
    })
    .join("; ");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sanitizeJudgeCandidate(raw: unknown): unknown {
  if (!isRecord(raw)) {
    return raw;
  }

  if (raw.verdict !== "reject") {
    return raw;
  }

  if (!Object.prototype.hasOwnProperty.call(raw, "state_patch")) {
    return raw;
  }

  const { state_patch: _ignored, ...rest } = raw;
  return rest;
}

export async function runTurn(deps: {
  rawInputText: string;
  judge: () => Promise<unknown>;
  narrate: (ctx: NarrateContext) => Promise<unknown>;
  state: Record<string, unknown>;
}): Promise<TurnResult> {
  let attempt = 0;
  let judgeResult: ReturnType<typeof JudgeOutputSchema.parse> | null = null;

  while (judgeResult === null) {
    try {
      const candidate = JudgeOutputSchema.parse(
        sanitizeJudgeCandidate(await deps.judge())
      );
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
        return systemFallback(
          deps.state,
          SYSTEM_ERROR_CODES.JUDGE_SCHEMA_INVALID,
          summarizeZodError(error)
        );
      }

      return systemFallback(
        deps.state,
        SYSTEM_ERROR_CODES.JUDGE_CALL_FAILED,
        extractErrorDetail(error)
      );
    }
  }

  const narrateContext = buildNarrateContext({
    rawInputText: deps.rawInputText,
    judge: judgeResult,
    state: deps.state
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
      return systemFallback(
        deps.state,
        SYSTEM_ERROR_CODES.NARRATE_SCHEMA_INVALID,
        summarizeZodError(error)
      );
    }

    return systemFallback(
      deps.state,
      SYSTEM_ERROR_CODES.NARRATE_CALL_FAILED,
      extractErrorDetail(error)
    );
  }
}
