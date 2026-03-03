import { describe, expect, it, vi } from "vitest";
import { stepInteraction } from "../../src/interaction/step-engine";

describe("stepInteraction", () => {
  it("returns exit and keeps state on /exit", async () => {
    const runTurn = vi.fn();
    const state = {
      onboarding: {
        completed: true,
        step: "world_background",
        role_profile: "小王",
        world_background: "都市"
      }
    };

    const out = await stepInteraction({
      rawInputText: "/exit",
      state,
      runTurn
    });

    expect(out).toEqual({
      kind: "exit",
      nextState: state
    });
    expect(runTurn).not.toHaveBeenCalled();
  });

  it("resets state on /reset without calling runTurn", async () => {
    const runTurn = vi.fn();
    const out = await stepInteraction({
      rawInputText: "/reset",
      state: {
        hp: 9,
        onboarding: { completed: true, step: "world_background" }
      },
      runTurn
    });

    expect(out).toEqual({
      kind: "system_ack",
      messageKey: "system_ack_session_reset",
      message: {
        en: "Session state reset.",
        zh: "会话已重置。"
      },
      nextState: {}
    });
    expect(runTurn).not.toHaveBeenCalled();
  });

  it("collects role then world background before allowing turn execution", async () => {
    const runTurn = vi.fn();

    const step1 = await stepInteraction({
      rawInputText: "我是游侠",
      state: {},
      runTurn
    });
    const step2 = await stepInteraction({
      rawInputText: "蒸汽朋克废土",
      state: step1.nextState,
      runTurn
    });

    expect(step1.kind).toBe("onboarding_ack");
    expect(step1.messageKey).toBe("onboarding_ack_role_recorded");
    expect(step1.nextState.onboarding).toEqual({
      completed: false,
      step: "world_background",
      role_profile: "我是游侠"
    });

    expect(step2.kind).toBe("onboarding_ack");
    expect(step2.messageKey).toBe("onboarding_ack_world_recorded_complete");
    expect(step2.nextState.onboarding).toEqual({
      completed: true,
      step: "world_background",
      role_profile: "我是游侠",
      world_background: "蒸汽朋克废土"
    });
    expect(runTurn).not.toHaveBeenCalled();
  });

  it("runs turn after onboarding completion and forwards args", async () => {
    const runTurn = vi.fn().mockResolvedValue({
      narration_text: "你站在城市中心。",
      reference: "你可以先观察附近的街区。",
      reason_code: undefined,
      system_error_code: undefined,
      debug: { judge_ms: 20 },
      state: { hp: 10 }
    });
    const state = {
      onboarding: {
        completed: true,
        step: "world_background",
        role_profile: "小王",
        world_background: "都市"
      }
    };

    const out = await stepInteraction({
      rawInputText: "我在哪",
      state,
      debug: true,
      runTurn
    });

    expect(runTurn).toHaveBeenCalledWith({
      rawInputText: "我在哪",
      state,
      debug: true
    });
    expect(out.kind).toBe("turn_result");
    if (out.kind === "turn_result") {
      expect(out.nextState).toEqual({ hp: 10 });
      expect(out.output.narration_text).toBe("你站在城市中心。");
      expect(out.output.reference).toBe("你可以先观察附近的街区。");
      expect(out.output.debug).toEqual({ judge_ms: 20 });
    }
  });
});
