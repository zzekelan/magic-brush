import { describe, expect, it } from "vitest";
import {
  INTERACTION_MESSAGES,
  localizeBilingualMessage,
  localizeMessage,
  renderBilingualMessage
} from "../../src/interaction/messages";

describe("interaction messages", () => {
  it("localizes message by language key", () => {
    expect(localizeMessage(INTERACTION_MESSAGES.system_ack_session_reset, "en")).toBe(
      "Session state reset."
    );
    expect(localizeMessage(INTERACTION_MESSAGES.system_ack_session_reset, "zh")).toBe("会话已重置。");
  });

  it("resolves localized text from standard bilingual payload", () => {
    const payload = renderBilingualMessage(INTERACTION_MESSAGES.onboarding_ack_setup_already_complete);

    expect(localizeBilingualMessage(payload, "en")).toBe(
      "Setup already complete. You can start taking actions."
    );
    expect(localizeBilingualMessage(payload, "zh")).toBe("设定已完成，你可以开始行动。");
    expect(localizeBilingualMessage("unknown", "en")).toBeUndefined();
  });
});
