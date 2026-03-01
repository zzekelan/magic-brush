import { describe, expect, it } from "vitest";
import {
  applyOnboardingInput,
  applyReplCommand,
  formatReplOutput,
  getOnboardingPrompt,
  isOnboardingComplete,
  shouldExit
} from "../../src/cli/repl-session";

describe("repl session helpers", () => {
  it("resets state on /reset", () => {
    const next = applyReplCommand("/reset", {
      hp: 9,
      approved_interaction_history: [{ raw_input_text: "look", narration_text: "x" }]
    });
    expect(next).toEqual({});
  });

  it("detects exit command", () => {
    expect(shouldExit("/exit")).toBe(true);
    expect(shouldExit("look around")).toBe(false);
  });
});

describe("onboarding helpers", () => {
  it("is incomplete by default", () => {
    expect(isOnboardingComplete({})).toBe(false);
  });

  it("starts by asking role profile prompt", () => {
    const prompt = getOnboardingPrompt({});
    const lines = prompt.split("\n");

    expect(lines[0]).toMatch(/Please define your role/i);
    expect(lines[1]).toMatch(/请先定义你的角色/i);
  });

  it("moves from role profile step to world background step", () => {
    const next = applyOnboardingInput("我是游侠", {});

    expect(next.state.onboarding).toEqual({
      completed: false,
      step: "world_background",
      role_profile: "我是游侠"
    });
    expect(next.message).toMatch(/世界背景/i);
  });

  it("stores required onboarding fields after completion", () => {
    const step1 = applyOnboardingInput("我是游侠", {});
    const step2 = applyOnboardingInput("蒸汽朋克废土", step1.state);

    expect(step2.state.onboarding).toEqual({
      completed: true,
      step: "world_background",
      role_profile: "我是游侠",
      world_background: "蒸汽朋克废土"
    });
    expect(isOnboardingComplete(step2.state)).toBe(true);
    expect(step2.message).toMatch(/开始行动/i);
  });
});

describe("formatReplOutput", () => {
  it("prints narration and reference text only when debug is false", () => {
    const out = formatReplOutput(
      {
        narration_text: "你看向街口。",
        reference: "向东侧巷道走近一些。",
        state: { hp: 10 }
      },
      false
    );

    expect(out).toBe("你看向街口。\n向东侧巷道走近一些。");
  });

  it("does not print an empty reference line in non-debug mode", () => {
    const out = formatReplOutput(
      {
        narration_text: "请继续定义你的世界背景。",
        reference: ""
      },
      false
    );

    expect(out).toBe("请继续定义你的世界背景。");
  });

  it("prints error line when system_error_code exists in non-debug mode", () => {
    const out = formatReplOutput(
      {
        narration_text: "系统繁忙，请稍后再试。",
        reference: "稍等片刻再行动。",
        system_error_code: "NARRATE_CALL_FAILED"
      },
      false
    );

    expect(out).toContain("系统繁忙，请稍后再试。");
    expect(out).toContain("稍等片刻再行动。");
    expect(out).toContain("Error: NARRATE_CALL_FAILED");
  });

  it("keeps full json output when debug is true", () => {
    const out = formatReplOutput(
      {
        narration_text: "ok",
        reference: "go",
        state: { hp: 10 }
      },
      true
    );

    expect(out).toContain("\"narration_text\": \"ok\"");
    expect(out).toContain("\"state\"");
  });
});
