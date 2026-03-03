import {
  applyOnboardingInput,
  applyReplCommand,
  getOnboardingStep,
  isOnboardingComplete,
  shouldExit
} from "../cli/repl-session";
import { INTERACTION_MESSAGES } from "./messages";
import type { InteractionStepResult, TurnLikeOutput } from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeTurnOutput(
  raw: unknown,
  fallbackState: Record<string, unknown>
): TurnLikeOutput {
  if (!isRecord(raw)) {
    return {
      narration_text: "",
      reference: "",
      state: fallbackState
    };
  }

  const state = isRecord(raw.state) ? raw.state : fallbackState;
  const narrationText = typeof raw.narration_text === "string" ? raw.narration_text : "";
  const reference = typeof raw.reference === "string" ? raw.reference : "";

  return {
    ...raw,
    narration_text: narrationText,
    reference,
    state
  };
}

export async function stepInteraction(input: {
  rawInputText: string;
  state: Record<string, unknown>;
  debug?: boolean;
  runTurn: (args: {
    rawInputText: string;
    state: Record<string, unknown>;
    debug?: boolean;
  }) => Promise<unknown>;
}): Promise<InteractionStepResult> {
  const text = input.rawInputText.trim();

  if (shouldExit(text)) {
    return {
      kind: "exit",
      nextState: input.state
    };
  }

  const nextStateFromCommand = applyReplCommand(text, input.state);
  if (nextStateFromCommand !== input.state) {
    return {
      kind: "system_ack",
      messageKey: "system_ack_session_reset",
      message: INTERACTION_MESSAGES.system_ack_session_reset,
      nextState: nextStateFromCommand
    };
  }

  if (!isOnboardingComplete(input.state)) {
    const onboardingStep = getOnboardingStep(input.state);
    const onboarding = applyOnboardingInput(text, input.state);
    const messageKey =
      onboardingStep === "world_background"
        ? "onboarding_ack_world_recorded_complete"
        : "onboarding_ack_role_recorded";
    return {
      kind: "onboarding_ack",
      messageKey,
      message: INTERACTION_MESSAGES[messageKey],
      nextState: onboarding.state
    };
  }

  const output = normalizeTurnOutput(
    await input.runTurn({
      rawInputText: text,
      debug: input.debug,
      state: input.state
    }),
    input.state
  );

  return {
    kind: "turn_result",
    output,
    nextState: output.state
  };
}
