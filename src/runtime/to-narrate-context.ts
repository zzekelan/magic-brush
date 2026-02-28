import type { ReasonCode } from "../contracts/reason-codes";

export function toNarrateContext(input: {
  verdict: "approve" | "reject";
  reason_code: ReasonCode;
  internal_reason?: string;
}) {
  return {
    verdict: input.verdict,
    reason_code: input.reason_code,
    safe_hint: input.verdict === "reject" ? "action_rejected" : "action_approved"
  };
}
