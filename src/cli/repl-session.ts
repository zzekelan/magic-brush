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

type OnboardingStep = "role_profile" | "world_background";

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

export function getOnboardingPrompt(state: Record<string, unknown>): string {
  const onboarding = readOnboarding(state);
  if (onboarding?.completed === true) {
    return [
      "Onboarding complete. You can start taking actions.",
      "角色与世界背景已设定，可开始行动。"
    ].join("\n");
  }

  if (onboarding?.step === "world_background") {
    return [
      "Please define your world background first.",
      "请先定义你的世界背景。"
    ].join("\n");
  }

  return [
    "Please define your role first.",
    "请先定义你的角色。"
  ].join("\n");
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
      message: "角色与世界背景已设定，可开始行动。"
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
      message: "设定完成，你可以开始行动。"
    };
  }

  return {
    state: withOnboarding(state, {
      completed: false,
      step: "world_background",
      role_profile: text
    }),
    message: "请继续定义你的世界背景。"
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

export function formatReplOutput(output: ReplOutput, debug: boolean): string {
  if (debug) {
    return JSON.stringify(output, null, 2);
  }

  const lines = [output.narration_text, output.reference];

  if (output.system_error_code) {
    const detail =
      typeof output.system_error_detail === "string" && output.system_error_detail.length > 0
        ? ` (${output.system_error_detail})`
        : "";
    lines.push(`Error: ${output.system_error_code}${detail}`);
  }

  return lines.join("\n");
}
