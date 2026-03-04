import type { InteractionStepResult, TurnLikeOutput } from "./types";

export type ReplRender =
  | {
      kind: "onboarding_prompt" | "onboarding_ack" | "system_ack";
      text: string;
    }
  | {
      kind: "turn_result";
      output: TurnLikeOutput;
    };

export function toReplRender(step: InteractionStepResult): ReplRender | null {
  if (step.kind === "noop" || step.kind === "exit") {
    return null;
  }

  if (step.kind === "turn_result") {
    return {
      kind: "turn_result",
      output: {
        narration_text: step.output.narration_text,
        reference: step.output.reference,
        state: step.output.state,
        reason_code: step.output.reason_code,
        system_error_code: step.output.system_error_code,
        system_error_detail: step.output.system_error_detail,
        debug: step.output.debug
      }
    };
  }

  return {
    kind: step.kind,
    text: step.text
  };
}
