import type { JudgeOutput } from "../contracts/judge";

export type NarrateContext = {
  verdict: JudgeOutput["verdict"];
  reason_code: JudgeOutput["reason_code"];
  safe_hint: "action_approved" | "action_rejected";
};

export function buildNarrateContext(input: JudgeOutput): NarrateContext {
  return {
    verdict: input.verdict,
    reason_code: input.reason_code,
    safe_hint: input.verdict === "reject" ? "action_rejected" : "action_approved"
  };
}
