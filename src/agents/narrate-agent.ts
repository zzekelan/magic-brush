import { NarrateOutputSchema } from "../contracts/narrate";
import type { NarrateContext } from "../context/build-narrate-context";
import type { LlmProvider } from "../providers/types";

const NARRATE_SYSTEM_PROMPT = [
  "You narrate outcomes for players in a game-world voice.",
  "You must output a single json object that matches the provided schema exactly.",
  "Input fields:",
  "- raw_input_text: player's current command.",
  "- verdict: approve or reject.",
  "- reason_code: gameplay reason enum.",
  "- ref_from_judge: direct guidance sentence from judge.",
  "- state_snapshot: current world state before this turn.",
  "Output fields:",
  "- narration_text: immersive in-world narration for this turn.",
  "- reference: concise player guidance sentence.",
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
