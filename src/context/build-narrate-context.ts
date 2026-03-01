import type { JudgeOutput } from "../contracts/judge";

export type NarrateContext = {
  raw_input_text: string;
  verdict: JudgeOutput["verdict"];
  reason_code: JudgeOutput["reason_code"];
  ref_from_judge: string;
  state_snapshot: Record<string, unknown>;
};

export function buildNarrateContext(input: {
  rawInputText: string;
  judge: JudgeOutput;
  state: Record<string, unknown>;
}): NarrateContext {
  return {
    raw_input_text: input.rawInputText,
    verdict: input.judge.verdict,
    reason_code: input.judge.reason_code,
    ref_from_judge: input.judge.ref_from_judge,
    state_snapshot: input.state
  };
}
