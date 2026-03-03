import { INTERACTION_MESSAGES, renderBilingualMessage } from "../interaction/messages";
import type { LocalizedText, OnboardingStep } from "../interaction/types";

export function shouldExit(input: string): boolean {
  return input.trim() === "/exit";
}

type ReplOutput = {
  narration_text: string;
  reference: string;
  system_error_code?: string;
  system_error_detail?: string;
  [key: string]: unknown;
};

export type ReplRender =
  | {
      kind: "onboarding_prompt" | "onboarding_ack" | "system_ack";
      text: string;
    }
  | {
      kind: "turn_result";
      output: ReplOutput;
    };

type OnboardingState = {
  completed: boolean;
  step: OnboardingStep;
  role_profile?: string;
  world_background?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readOnboarding(state: Record<string, unknown>): OnboardingState | undefined {
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

export function isOnboardingComplete(state: Record<string, unknown>): boolean {
  return readOnboarding(state)?.completed === true;
}

export function getOnboardingStep(state: Record<string, unknown>): OnboardingStep {
  return readOnboarding(state)?.step === "world_background" ? "world_background" : "role_profile";
}

export function getOnboardingPromptMessage(state: Record<string, unknown>): LocalizedText {
  if (getOnboardingStep(state) === "world_background") {
    return INTERACTION_MESSAGES.onboarding_prompt_world_background;
  }

  return INTERACTION_MESSAGES.onboarding_prompt_role;
}

export function getOnboardingPrompt(state: Record<string, unknown>): string {
  return renderBilingualMessage(getOnboardingPromptMessage(state));
}

export function applyOnboardingInput(
  input: string,
  state: Record<string, unknown>
): { state: Record<string, unknown>; message: string } {
  const text = input.trim();
  const current = readOnboarding(state);

  if (current?.completed === true) {
    return {
      state,
      message: renderBilingualMessage(INTERACTION_MESSAGES.onboarding_ack_setup_already_complete)
    };
  }

  if (current?.step === "world_background") {
    return {
      state: withOnboarding(state, {
        completed: true,
        step: "world_background",
        role_profile: current.role_profile,
        world_background: text
      }),
      message: renderBilingualMessage(INTERACTION_MESSAGES.onboarding_ack_world_recorded_complete)
    };
  }

  return {
    state: withOnboarding(state, {
      completed: false,
      step: "world_background",
      role_profile: text
    }),
    message: renderBilingualMessage(INTERACTION_MESSAGES.onboarding_ack_role_recorded)
  };
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
