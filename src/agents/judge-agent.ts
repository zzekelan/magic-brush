import { JudgeOutputSchema } from "../contracts/judge";
import type { JudgeContext } from "../context/build-judge-context";
import type { LlmProvider } from "../providers/types";

export function createJudgeAgent(provider: LlmProvider) {
  return {
    async run(context: JudgeContext) {
      return provider.generateStructured({
        task: "judge",
        schemaName: "JudgeOutput",
        schema: JudgeOutputSchema,
        messages: [
          { role: "system", content: "You are the judge for game actions." },
          { role: "user", content: JSON.stringify(context) }
        ]
      });
    }
  };
}
