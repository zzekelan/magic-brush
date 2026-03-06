import { JudgeOutputSchema } from "../contracts/judge";
import type { JudgeContext } from "../context/build-judge-context";
import type { LlmProvider } from "../providers/types";

const JUDGE_SYSTEM_PROMPT = [
  "You evaluate whether an in-world action can proceed.",
  "You must output a single json object that matches the provided schema exactly.",
  "Input fields:",
  "- raw_input_text: current action statement.",
  "- state_snapshot: current world state before this turn.",
  "- state_snapshot.completed_turn_count: number of completed in-game interaction turns.",
  "- state_snapshot.current_turn_index: 1-based index of the turn being judged right now.",
  "- state_snapshot.onboarding (optional): onboarding state when REPL setup is in progress/completed.",
  "  - completed: whether onboarding finished.",
  "  - step: current onboarding step, role_profile or world_background.",
  "  - role_profile: declared role text.",
  "  - world_background: declared world background text.",
  "Judging policy:",
  "Treat world_background as a world seed, not an approval threshold.",
  "Approved interaction history and onboarding seed are stronger evidence than conversational flavor.",
  "Conversation context supports continuity, but should not alone block an action.",
  "Do not reject only because world detail is sparse.",
  "Unknown local detail should usually remain playable.",
  "Prefer a minimal in-world interpretation that keeps the turn playable.",
  "Reject only for direct contradiction, unfillable prerequisite, or safety risk.",
  "APPROVED means the action can proceed normally.",
  "RULE_CONFLICT means the action directly contradicts established facts.",
  "MISSING_PREREQ means a required prerequisite is missing and cannot be filled naturally in this turn.",
  "OUT_OF_SCOPE_ACTION is a rare fallback for requests that are clearly outside playable scene scale.",
  "SAFETY_BLOCKED means the action is blocked by safety policy.",
  "Output fields:",
  "- verdict: approve or reject.",
  "- reason_code: must be APPROVED, RULE_CONFLICT, MISSING_PREREQ, OUT_OF_SCOPE_ACTION, or SAFETY_BLOCKED.",
  "- internal_reason: private diagnostic reason.",
  "- confidence: number in [0, 1].",
  "- ref_from_judge: one concrete in-world guidance sentence in second person.",
  "When verdict is approve, reason_code must be APPROVED.",
  "When current_turn_index <= 2, prefer approve unless clear contradiction, unfillable prerequisite, or safety risk exists.",
  "When current_turn_index <= 2 and low-information input is a greeting such as \"hello\", \"hello, world!\", \"你好\", or \"你好，世界！\", prefer approve.",
  "For these greetings, keep ref_from_judge positive, welcoming, and immediately actionable.",
  "If verdict is reject, ref_from_judge must provide one concrete, immediately executable next action.",
  "Use immersive in-world language only.",
  "Avoid out-of-world meta wording.",
  "Follow the same language as raw_input_text.",
  "Do not include any keys outside the schema."
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
