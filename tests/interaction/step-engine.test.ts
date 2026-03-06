import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { stepInteraction } from "../../src/interaction/step-engine";

describe("stepInteraction", () => {
  it("does not import cli layer from interaction core", async () => {
    const sourcePath = resolve(import.meta.dirname, "../../src/interaction/step-engine.ts");
    const source = await readFile(sourcePath, "utf8");
    expect(source).not.toContain("../cli/repl-session");
  });

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

  it("returns noop and keeps state on blank input", async () => {
    const runTurn = vi.fn();
    const state = {
      onboarding: {
        completed: false,
        step: "role_profile"
      }
    };

    const out = await stepInteraction({
      rawInputText: "   ",
      state,
      runTurn
    });

    expect(out).toEqual({
      kind: "noop",
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
      text: "Session state reset.\n会话已重置。",
      nextState: {}
    });
    expect(runTurn).not.toHaveBeenCalled();
  });

  it("completes onboarding after world background without calling runJudge", async () => {
    const runTurn = vi.fn();
    const runJudge = vi.fn();

    const step1 = await stepInteraction({
      rawInputText: "我是游侠",
      state: {},
      runTurn
    });
    const step2 = await stepInteraction({
      rawInputText: "蒸汽朋克废土",
      state: step1.nextState,
      runTurn,
      runJudge
    });

    expect(step1.kind).toBe("onboarding_ack");
    if (step1.kind === "onboarding_ack") {
      expect(step1.text).toBe("Role profile recorded.\n已记录角色设定。");
    }
    expect(step1.nextState.onboarding).toEqual({
      completed: false,
      step: "world_background",
      role_profile: "我是游侠"
    });

    expect(step2.kind).toBe("onboarding_ack");
    if (step2.kind === "onboarding_ack") {
      expect(step2.text).toBe(
        "World background recorded. Setup complete, you can start taking actions.\n已记录世界背景。设定完成，你可以开始行动。"
      );
    }
    expect(step2.nextState.onboarding).toEqual({
      completed: true,
      step: "world_background",
      role_profile: "我是游侠",
      world_background: "蒸汽朋克废土"
    });
    expect(step2.nextState.completed_turn_count).toBe(0);
    expect(step2.nextState).not.toHaveProperty("interaction_turn_count");
    expect(runJudge).not.toHaveBeenCalled();
    expect(runTurn).not.toHaveBeenCalled();
  });

  it("runs turn immediately after onboarding completion", async () => {
    const runTurn = vi.fn().mockResolvedValue({
      narration_text: "你看到齿轮塔投下阴影。",
      reference: "继续观察街道。",
      state: {
        onboarding: {
          completed: true,
          step: "world_background",
          role_profile: "我是游侠",
          world_background: "蒸汽朋克废土"
        },
        completed_turn_count: 1
      }
    });

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
    const out = await stepInteraction({
      rawInputText: "我推开酒馆后门看看外面",
      state: step2.nextState,
      runTurn
    });

    expect(runTurn).toHaveBeenCalledWith({
      rawInputText: "我推开酒馆后门看看外面",
      state: step2.nextState,
      debug: undefined
    });
    expect(out.kind).toBe("turn_result");
    if (out.kind === "turn_result") {
      expect(out.output.narration_text).toBe("你看到齿轮塔投下阴影。");
      expect(out.output.reference).toBe("继续观察街道。");
      expect(out.nextState.completed_turn_count).toBe(1);
    }
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
