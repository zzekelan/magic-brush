import { NarrateOutputSchema } from "../contracts/narrate";
import type { NarrateContext } from "../context/build-narrate-context";
import type { LlmProvider } from "../providers/types";

const NARRATE_SYSTEM_PROMPT = [
  "You narrate outcomes in an immersive in-world voice.",
  "You must output a single json object that matches the provided schema exactly.",
  "Input fields:",
  "- raw_input_text: current action statement.",
  "- verdict: approve or reject.",
  "- reason_code: outcome reason enum.",
  "- ref_from_judge: direct guidance sentence from judge.",
  "- state_snapshot: current world state before this turn; may include conversation_context.",
  "- state_snapshot.onboarding (optional): onboarding state from REPL setup.",
  "  - completed: whether onboarding finished.",
  "  - step: current onboarding step, role_profile or world_background.",
  "  - role_profile: declared role text.",
  "  - world_background: declared world background text.",
  "Output fields:",
  "- narration_text: immersive in-world narration for this turn.",
  "- reference: concise in-world next-step hint in second person.",
  "Use conversation_context for dialogue continuity when available.",
  "Do not treat rejected entries as world facts.",
  "Keep both narration_text and reference immersive and in-world.",
  "Avoid out-of-world meta wording.",
  "Follow the same language as raw_input_text.",
  "Do not include any keys outside the schema.",
  "Do not output policy-review wording such as approved, blocked, or safety review."
].join("\n");

export function createNarrateAgent(provider: LlmProvider) {
  return {
    async run(context: NarrateContext) {
      return provider.generateStructured({
        task: "narrate",
        schemaName: "NarrateOutput",
        schema: NarrateOutputSchema,
        messages: [
          { role: "system", content: NARRATE_SYSTEM_PROMPT },
          { role: "user", content: JSON.stringify(context) }
        ]
      });
    }
  };
}
