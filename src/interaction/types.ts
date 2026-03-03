export type OnboardingStep = "role_profile" | "world_background";

export type LocalizedText = {
  en: string;
  zh: string;
};

export type InteractionMessageKey =
  | "onboarding_prompt_role"
  | "onboarding_prompt_world_background"
  | "onboarding_ack_role_recorded"
  | "onboarding_ack_world_recorded_complete"
  | "onboarding_ack_setup_already_complete"
  | "system_ack_session_reset";

export type TurnLikeOutput = {
  narration_text: string;
  reference: string;
  state: Record<string, unknown>;
  reason_code?: string;
  system_error_code?: string;
  system_error_detail?: string;
  debug?: unknown;
  [key: string]: unknown;
};

export type InteractionStepResult =
  | {
      kind: "exit";
      nextState: Record<string, unknown>;
    }
  | {
      kind: "system_ack";
      nextState: Record<string, unknown>;
      messageKey: "system_ack_session_reset";
      message: LocalizedText;
    }
  | {
      kind: "onboarding_ack";
      nextState: Record<string, unknown>;
      messageKey:
        | "onboarding_ack_role_recorded"
        | "onboarding_ack_world_recorded_complete"
        | "onboarding_ack_setup_already_complete";
      message: LocalizedText;
    }
  | {
      kind: "turn_result";
      nextState: Record<string, unknown>;
      output: TurnLikeOutput;
    };
