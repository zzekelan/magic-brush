import type { InteractionMessageKey, LocalizedText } from "./types";

export const INTERACTION_MESSAGES: Record<InteractionMessageKey, LocalizedText> = {
  onboarding_prompt_role: {
    en: "Please define your role first.",
    zh: "请先定义你的角色。"
  },
  onboarding_prompt_world_background: {
    en: "Please define your world background first.",
    zh: "请先定义你的世界背景。"
  },
  onboarding_ack_role_recorded: {
    en: "Role profile recorded.",
    zh: "已记录角色设定。"
  },
  onboarding_ack_world_recorded_complete: {
    en: "World background recorded. Setup complete, you can start taking actions.",
    zh: "已记录世界背景。设定完成，你可以开始行动。"
  },
  onboarding_ack_setup_already_complete: {
    en: "Setup already complete. You can start taking actions.",
    zh: "设定已完成，你可以开始行动。"
  },
  system_ack_session_reset: {
    en: "Session state reset.",
    zh: "会话已重置。"
  }
};

export function renderBilingualMessage(message: LocalizedText): string {
  return `${message.en}\n${message.zh}`;
}
