import { JudgeOutputSchema } from "../contracts/judge";
import type { JudgeContext } from "../context/build-judge-context";
import type { LlmProvider } from "../providers/types";

const JUDGE_SYSTEM_PROMPT = [
  "You are the judge for game actions.",
  "You must output a single json object that matches the provided schema exactly.",
  "Input fields:",
  "- raw_input_text: player's current command.",
  "- state_snapshot: current world state before this turn.",
  "- narration_history: recent approved narrations (oldest to newest).",
  "Output fields:",
  "- verdict: approve or reject.",
  "- reason_code: must be exactly one of RULE_CONFLICT, MISSING_PREREQ, OUT_OF_SCOPE_ACTION, SAFETY_BLOCKED.",
  "- internal_reason: private diagnostic reason.",
  "- confidence: number in [0, 1].",
  "- ref_from_judge: one concrete player-facing guidance sentence.",
  "- state_patch: required object when verdict=approve; forbidden when verdict=reject."
].join("\n");

export function createJudgeAgent(provider: LlmProvider) {
  return {
    async run(context: JudgeContext) {
      return provider.generateStructured({
        task: "judge",
        schemaName: "JudgeOutput",
        schema: JudgeOutputSchema,
        messages: [
          { role: "system", content: JUDGE_SYSTEM_PROMPT },
          { role: "user", content: JSON.stringify(context) }
        ]
      });
    }
  };
}
