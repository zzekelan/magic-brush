import { ZodError } from "zod";
import { JudgeOutputSchema } from "../contracts/judge";
import { NarrateOutputSchema } from "../contracts/narrate";
import { SYSTEM_ERROR_CODES } from "../contracts/system-errors";
import { buildNarrateContext, type NarrateContext } from "../context/build-narrate-context";
import { commitApprovedInteraction, commitConversationContext } from "./commit";
import { CONFIDENCE_THRESHOLD, shouldRetryJudge, shouldRetryNarrate } from "./retry-policy";

type DebugStateSnapshot = {
  state_keys: string[];
  approved_interaction_history_tail: Array<{
    raw_input_text: string;
    narration_text: string;
  }>;
};

export type TurnDebug = {
  llm: {
    judge: {
      temperature: number;
      attempts: number;
      usage_total_tokens: number;
    };
    narrate: {
      temperature: number;
      attempts: number;
      usage_total_tokens: number;
    };
    usage_total_tokens: number;
  };
  judge_context_snapshot: {
    raw_input_text: string;
  } & DebugStateSnapshot;
  judge_result_snapshot?: {
    verdict: "approve" | "reject";
    reason_code: string;
    confidence: number;
    ref_from_judge: string;
  };
  narrate_context_snapshot?: {
    raw_input_text: string;
    verdict: "approve" | "reject";
    reason_code: string;
    ref_from_judge: string;
  } & DebugStateSnapshot;
  error?: {
    stage: "judge" | "narrate";
    system_error_code: string;
    system_error_detail?: string;
  };
};

export type TurnResult = {
  narration_text: string;
  reference: string;
  state: Record<string, unknown>;
  system_error_code?: string;
  system_error_detail?: string;
  debug?: TurnDebug;
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

function normalizeAgentRunResult(raw: unknown): { data: unknown; usage_total_tokens: number } {
  if (raw && typeof raw === "object" && "data" in raw) {
    const usage = (raw as { usage_total_tokens?: unknown }).usage_total_tokens;
    return {
      data: (raw as { data: unknown }).data,
      usage_total_tokens: typeof usage === "number" && usage >= 0 ? usage : 0
    };
  }

  return { data: raw, usage_total_tokens: 0 };
}

function readApprovedInteractionTail(state: Record<string, unknown>) {
  const raw = state.approved_interaction_history;
  if (!Array.isArray(raw)) {
    return [];
  }

  const entries = raw
    .filter(isRecord)
    .map((item) => ({
      raw_input_text:
        typeof item.raw_input_text === "string" ? item.raw_input_text : undefined,
      narration_text:
        typeof item.narration_text === "string" ? item.narration_text : undefined
    }))
    .filter(
      (
        item
      ): item is {
        raw_input_text: string;
        narration_text: string;
      } => Boolean(item.raw_input_text && item.narration_text)
    );

  return entries.slice(-3);
}

function buildStateSnapshot(state: Record<string, unknown>): DebugStateSnapshot {
  return {
    state_keys: Object.keys(state).sort(),
    approved_interaction_history_tail: readApprovedInteractionTail(state)
  };
}

function readInteractionTurnCount(state: Record<string, unknown>): number {
  const raw = state.interaction_turn_count;
  if (typeof raw !== "number" || !Number.isFinite(raw) || raw < 1) {
    return 1;
  }
  return Math.floor(raw);
}

export async function runTurn(deps: {
  rawInputText: string;
  debug?: boolean;
  judge: () => Promise<unknown>;
  narrate: (ctx: NarrateContext) => Promise<unknown>;
  state: Record<string, unknown>;
  judgeTemperature?: number;
  narrateTemperature?: number;
}): Promise<TurnResult> {
  const debugEnabled = deps.debug === true;
  const judgeTemperature = deps.judgeTemperature ?? 0;
  const narrateTemperature = deps.narrateTemperature ?? 1;
  let judgeAttempts = 0;
  let narrateAttempts = 0;
  let judgeUsageTotalTokens = 0;
  let narrateUsageTotalTokens = 0;
  let judgeResultSnapshot: TurnDebug["judge_result_snapshot"] | undefined;
  let narrateContextSnapshot: TurnDebug["narrate_context_snapshot"] | undefined;

  const judgeContextSnapshot: TurnDebug["judge_context_snapshot"] = {
    raw_input_text: deps.rawInputText,
    ...buildStateSnapshot(deps.state)
  };

  const withDebug = (
    result: TurnResult,
    error?: TurnDebug["error"]
  ): TurnResult => {
    if (!debugEnabled) {
      return result;
    }

    return {
      ...result,
      debug: {
        llm: {
          judge: {
            temperature: judgeTemperature,
            attempts: judgeAttempts,
            usage_total_tokens: judgeUsageTotalTokens
          },
          narrate: {
            temperature: narrateTemperature,
            attempts: narrateAttempts,
            usage_total_tokens: narrateUsageTotalTokens
          },
          usage_total_tokens: judgeUsageTotalTokens + narrateUsageTotalTokens
        },
        judge_context_snapshot: judgeContextSnapshot,
        judge_result_snapshot: judgeResultSnapshot,
        narrate_context_snapshot: narrateContextSnapshot,
        error
      }
    };
  };

  let attempt = 0;
  let judgeResult: ReturnType<typeof JudgeOutputSchema.parse> | null = null;

  while (judgeResult === null) {
    try {
      judgeAttempts += 1;
      const normalized = normalizeAgentRunResult(await deps.judge());
      judgeUsageTotalTokens += normalized.usage_total_tokens;
      const candidate = JudgeOutputSchema.parse(normalized.data);
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
        return withDebug(
          systemFallback(deps.state, SYSTEM_ERROR_CODES.JUDGE_LOW_CONFIDENCE),
          {
            stage: "judge",
            system_error_code: SYSTEM_ERROR_CODES.JUDGE_LOW_CONFIDENCE
          }
        );
      }

      judgeResultSnapshot = {
        verdict: candidate.verdict,
        reason_code: candidate.reason_code,
        confidence: candidate.confidence,
        ref_from_judge: candidate.ref_from_judge
      };
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
        const detail = summarizeZodError(error);
        return withDebug(
          systemFallback(
            deps.state,
            SYSTEM_ERROR_CODES.JUDGE_SCHEMA_INVALID
          ),
          {
            stage: "judge",
            system_error_code: SYSTEM_ERROR_CODES.JUDGE_SCHEMA_INVALID,
            system_error_detail: detail
          }
        );
      }

      const detail = extractErrorDetail(error);
      return withDebug(
          systemFallback(
            deps.state,
            SYSTEM_ERROR_CODES.JUDGE_CALL_FAILED
          ),
        {
          stage: "judge",
          system_error_code: SYSTEM_ERROR_CODES.JUDGE_CALL_FAILED,
          system_error_detail: detail
        }
      );
    }
  }

  const narrateContext = buildNarrateContext({
    rawInputText: deps.rawInputText,
    judge: judgeResult,
    state: deps.state
  });
  narrateContextSnapshot = {
    raw_input_text: narrateContext.raw_input_text,
    verdict: narrateContext.verdict,
    reason_code: narrateContext.reason_code,
    ref_from_judge: narrateContext.ref_from_judge,
    ...buildStateSnapshot(deps.state)
  };

  let narrateAttempt = 0;
  for (;;) {
    try {
      narrateAttempts += 1;
      const normalized = normalizeAgentRunResult(await deps.narrate(narrateContext));
      narrateUsageTotalTokens += normalized.usage_total_tokens;
      const narrateResult = NarrateOutputSchema.parse(normalized.data);
      const stateAfterApprovedCommit =
        judgeResult.verdict === "approve"
          ? commitApprovedInteraction({
              state: deps.state,
              rawInputText: deps.rawInputText,
              narrationText: narrateResult.narration_text
            })
          : deps.state;
      const nextStateWithContext = commitConversationContext({
        state: stateAfterApprovedCommit,
        rawInputText: deps.rawInputText,
        narrationText: narrateResult.narration_text,
        verdict: judgeResult.verdict,
        reasonCode: judgeResult.reason_code
      });
      const nextState = {
        ...nextStateWithContext,
        interaction_turn_count: readInteractionTurnCount(deps.state) + 1
      };

      return withDebug({
        ...narrateResult,
        state: nextState
      });
    } catch (error) {
      const needRetry = shouldRetryNarrate({
        attempt: narrateAttempt
      });

      if (needRetry) {
        narrateAttempt += 1;
        continue;
      }

      if (error instanceof ZodError) {
        const detail = summarizeZodError(error);
        return withDebug(
          systemFallback(
            deps.state,
            SYSTEM_ERROR_CODES.NARRATE_SCHEMA_INVALID
          ),
          {
            stage: "narrate",
            system_error_code: SYSTEM_ERROR_CODES.NARRATE_SCHEMA_INVALID,
            system_error_detail: detail
          }
        );
      }

      const detail = extractErrorDetail(error);
      return withDebug(
          systemFallback(
            deps.state,
            SYSTEM_ERROR_CODES.NARRATE_CALL_FAILED
          ),
        {
          stage: "narrate",
          system_error_code: SYSTEM_ERROR_CODES.NARRATE_CALL_FAILED,
          system_error_detail: detail
        }
      );
    }
  }
}
