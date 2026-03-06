import { ZodError } from "zod";
import { JudgeOutputSchema, type JudgeOutput } from "../contracts/judge";
import { SYSTEM_ERROR_CODES } from "../contracts/system-errors";
import { CONFIDENCE_THRESHOLD, shouldRetryJudge } from "./retry-policy";

type AgentRunResult = { data: unknown; usage_total_tokens: number };

function normalizeAgentRunResult(raw: unknown): AgentRunResult {
  if (raw && typeof raw === "object" && "data" in raw) {
    const usage = (raw as { usage_total_tokens?: unknown }).usage_total_tokens;
    return {
      data: (raw as { data: unknown }).data,
      usage_total_tokens: typeof usage === "number" && usage >= 0 ? usage : 0
    };
  }

  return { data: raw, usage_total_tokens: 0 };
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

export type JudgeStageResult =
  | {
      ok: true;
      output: JudgeOutput;
      attempts: number;
      usage_total_tokens: number;
    }
  | {
      ok: false;
      system_error_code:
        | typeof SYSTEM_ERROR_CODES.JUDGE_LOW_CONFIDENCE
        | typeof SYSTEM_ERROR_CODES.JUDGE_SCHEMA_INVALID
        | typeof SYSTEM_ERROR_CODES.JUDGE_CALL_FAILED;
      system_error_detail?: string;
      attempts: number;
      usage_total_tokens: number;
    };

export async function runJudgeStage(input: {
  judge: () => Promise<unknown>;
}): Promise<JudgeStageResult> {
  let attempt = 0;
  let calls = 0;
  let usageTotalTokens = 0;

  for (;;) {
    try {
      calls += 1;
      const normalized = normalizeAgentRunResult(await input.judge());
      usageTotalTokens += normalized.usage_total_tokens;
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
        return {
          ok: false,
          system_error_code: SYSTEM_ERROR_CODES.JUDGE_LOW_CONFIDENCE,
          attempts: calls,
          usage_total_tokens: usageTotalTokens
        };
      }

      return {
        ok: true,
        output: candidate,
        attempts: calls,
        usage_total_tokens: usageTotalTokens
      };
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
        return {
          ok: false,
          system_error_code: SYSTEM_ERROR_CODES.JUDGE_SCHEMA_INVALID,
          system_error_detail: summarizeZodError(error),
          attempts: calls,
          usage_total_tokens: usageTotalTokens
        };
      }

      return {
        ok: false,
        system_error_code: SYSTEM_ERROR_CODES.JUDGE_CALL_FAILED,
        system_error_detail: extractErrorDetail(error),
        attempts: calls,
        usage_total_tokens: usageTotalTokens
      };
    }
  }
}
