import type { OnboardingStep } from "./types";

export type OnboardingState = {
  completed: boolean;
  step: OnboardingStep;
  role_profile?: string;
  world_background?: string;
};

export type OnboardingPromptMessageKey =
  | "onboarding_prompt_role"
  | "onboarding_prompt_world_background";

export type OnboardingAckMessageKey =
  | "onboarding_ack_role_recorded"
  | "onboarding_ack_world_recorded_complete"
  | "onboarding_ack_setup_already_complete";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function readOnboarding(state: Record<string, unknown>): OnboardingState | undefined {
  const raw = state.onboarding;
  if (!isRecord(raw)) {
    return undefined;
  }

  const completed = raw.completed === true;
  const step = raw.step === "world_background" ? "world_background" : "role_profile";
  const roleProfile = typeof raw.role_profile === "string" ? raw.role_profile : undefined;
  const worldBackground =
    typeof raw.world_background === "string" ? raw.world_background : undefined;

  return {
    completed,
    step,
    role_profile: roleProfile,
    world_background: worldBackground
  };
}

function withOnboarding(
  state: Record<string, unknown>,
  onboarding: OnboardingState
): Record<string, unknown> {
  return {
    ...state,
    onboarding
  };
}

function withCompletedTurnCount(
  state: Record<string, unknown>,
  completedTurnCount: number
): Record<string, unknown> {
  const {
    completed_turn_count: _ignoredCompletedTurnCount,
    current_turn_index: _ignoredCurrentTurnIndex,
    interaction_turn_count: _ignoredLegacyInteractionTurnCount,
    ...rest
  } = state;

  return {
    ...rest,
    completed_turn_count: completedTurnCount
  };
}

export function shouldExit(input: string): boolean {
  return input.trim() === "/exit";
}

export function isNoopInput(input: string): boolean {
  return input.trim() === "";
}

export function applyReplCommand(
  input: string,
  state: Record<string, unknown>
): Record<string, unknown> {
  if (input.trim() === "/reset") {
    return {};
  }

  return state;
}

export function isOnboardingComplete(state: Record<string, unknown>): boolean {
  return readOnboarding(state)?.completed === true;
}

export function getOnboardingStep(state: Record<string, unknown>): OnboardingStep {
  return readOnboarding(state)?.step === "world_background" ? "world_background" : "role_profile";
}

export function getOnboardingPromptMessageKey(
  state: Record<string, unknown>
): OnboardingPromptMessageKey {
  if (getOnboardingStep(state) === "world_background") {
    return "onboarding_prompt_world_background";
  }

  return "onboarding_prompt_role";
}

export function applyOnboardingInput(
  input: string,
  state: Record<string, unknown>
): {
  state: Record<string, unknown>;
  messageKey: OnboardingAckMessageKey;
} {
  const text = input.trim();
  const current = readOnboarding(state);

  if (current?.completed === true) {
    return {
      state,
      messageKey: "onboarding_ack_setup_already_complete"
    };
  }

  if (current?.step === "world_background") {
    const onboardingCompletedState = withOnboarding(state, {
      completed: true,
      step: "world_background",
      role_profile: current.role_profile,
      world_background: text
    });

    return {
      state: withCompletedTurnCount(onboardingCompletedState, 0),
      messageKey: "onboarding_ack_world_recorded_complete"
    };
  }

  return {
    state: withOnboarding(state, {
      completed: false,
      step: "world_background",
      role_profile: text
    }),
    messageKey: "onboarding_ack_role_recorded"
  };
}
