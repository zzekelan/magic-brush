import type { JudgeOutput } from "../contracts/judge";

export type NarrateContext = {
  verdict: JudgeOutput["verdict"];
  reason_code: JudgeOutput["reason_code"];
  ref_from_judge: string;
  narration_history: string[];
};

export function buildNarrateContext(input: {
  judge: JudgeOutput;
  narrationHistory: string[];
}): NarrateContext {
  return {
    verdict: input.judge.verdict,
    reason_code: input.judge.reason_code,
    ref_from_judge: input.judge.ref_from_judge,
    narration_history: input.narrationHistory
  };
}
