import type { JudgeOutput } from "../contracts/judge";
import { buildJudgeContext, type JudgeContext } from "../context/build-judge-context";
import { buildRuntimeStateSnapshot, normalizePersistedState } from "./normalize-state";
import { runJudgeStage } from "./judge-stage";

export type ExecuteJudgeInput = {
  rawInputText: string;
  state: Record<string, unknown>;
  judgeAgent: { run: (ctx: JudgeContext) => Promise<unknown> };
};

export type ExecuteJudgeResult =
  | {
      ok: true;
      output: JudgeOutput;
      usage_total_tokens: number;
    }
  | {
      ok: false;
      system_error_code:
        | "JUDGE_LOW_CONFIDENCE"
        | "JUDGE_SCHEMA_INVALID"
        | "JUDGE_CALL_FAILED";
      usage_total_tokens: number;
    };

export async function executeJudge(input: ExecuteJudgeInput): Promise<ExecuteJudgeResult> {
  const persistedState = normalizePersistedState(input.state);
  const judgeContext = buildJudgeContext({
    rawInputText: input.rawInputText,
    state: buildRuntimeStateSnapshot(persistedState)
  });

  const out = await runJudgeStage({
    judge: () => input.judgeAgent.run(judgeContext)
  });

  if (out.ok) {
    return {
      ok: true,
      output: out.output,
      usage_total_tokens: out.usage_total_tokens
    };
  }

  return {
    ok: false,
    system_error_code: out.system_error_code,
    usage_total_tokens: out.usage_total_tokens
  };
}
