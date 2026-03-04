import {
  applyOnboardingInput,
  applyReplCommand,
  isOnboardingComplete,
  isNoopInput,
  shouldExit
} from "./session-core";
import { INTERACTION_MESSAGES, renderBilingualMessage } from "./messages";
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
    narration_text: narrationText,
    reference,
    state,
    reason_code: typeof raw.reason_code === "string" ? raw.reason_code : undefined,
    system_error_code:
      typeof raw.system_error_code === "string" ? raw.system_error_code : undefined,
    system_error_detail:
      typeof raw.system_error_detail === "string" ? raw.system_error_detail : undefined,
    debug: raw.debug
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

  if (isNoopInput(text)) {
    return {
      kind: "noop",
      nextState: input.state
    };
  }

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
      text: renderBilingualMessage(INTERACTION_MESSAGES.system_ack_session_reset),
      nextState: nextStateFromCommand
    };
  }

  if (!isOnboardingComplete(input.state)) {
    const onboarding = applyOnboardingInput(text, input.state);
    return {
      kind: "onboarding_ack",
      text: renderBilingualMessage(INTERACTION_MESSAGES[onboarding.messageKey]),
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
