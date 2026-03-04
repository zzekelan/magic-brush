import { INTERACTION_MESSAGES, renderBilingualMessage } from "../interaction/messages";
import {
  applyOnboardingInput as applyOnboardingInputCore,
  applyReplCommand as applyReplCommandCore,
  getOnboardingPromptMessageKey,
  getOnboardingStep,
  isOnboardingComplete,
  shouldExit
} from "../interaction/session-core";
import type { ReplRender } from "../interaction/repl-render";
import type { LocalizedText } from "../interaction/types";

export { getOnboardingStep, isOnboardingComplete, shouldExit };

export function getOnboardingPromptMessage(state: Record<string, unknown>): LocalizedText {
  const messageKey = getOnboardingPromptMessageKey(state);
  return INTERACTION_MESSAGES[messageKey];
}

export function getOnboardingPrompt(state: Record<string, unknown>): string {
  return renderBilingualMessage(getOnboardingPromptMessage(state));
}

export function applyOnboardingInput(
  input: string,
  state: Record<string, unknown>
): { state: Record<string, unknown>; message: string } {
  const next = applyOnboardingInputCore(input, state);
  return {
    state: next.state,
    message: renderBilingualMessage(INTERACTION_MESSAGES[next.messageKey])
  };
}

export function applyReplCommand(
  input: string,
  state: Record<string, unknown>
): Record<string, unknown> {
  return applyReplCommandCore(input, state);
}

export function formatReplRender(render: ReplRender, debug: boolean): string {
  if (debug) {
    return JSON.stringify(render, null, 2);
  }

  if (
    render.kind === "onboarding_prompt" ||
    render.kind === "onboarding_ack" ||
    render.kind === "system_ack"
  ) {
    return render.text;
  }

  const output = render.output;
  const lines = [output.narration_text, output.reference].filter(
    (line) => typeof line === "string" && line.length > 0
  );

  if (output.system_error_code) {
    const detail =
      typeof output.system_error_detail === "string" && output.system_error_detail.length > 0
        ? ` (${output.system_error_detail})`
        : "";
    lines.push(`Error: ${output.system_error_code}${detail}`);
  }

  return lines.join("\n");
}
