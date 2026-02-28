import { NarrateOutputSchema } from "../contracts/narrate";
import type { NarrateContext } from "../context/build-narrate-context";
import type { LlmProvider } from "../providers/types";

export function createNarrateAgent(provider: LlmProvider) {
  return {
    async run(context: NarrateContext) {
      return provider.generateStructured({
        task: "narrate",
        schemaName: "NarrateOutput",
        schema: NarrateOutputSchema,
        messages: [
          { role: "system", content: "You narrate outcomes for players." },
          { role: "user", content: JSON.stringify(context) }
        ]
      });
    }
  };
}
