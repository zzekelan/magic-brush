import { describe, expect, it } from "vitest";
import { runReplSession } from "../../src/cli/run-turn-repl";

function makeAsk(inputs: string[]) {
  let index = 0;
  return async (_prompt: string) => {
    if (index >= inputs.length) {
      throw new Error("Unexpected extra prompt");
    }
    const next = inputs[index];
    index += 1;
    return next;
  };
}

describe("runReplSession", () => {
  it("gates turn execution until onboarding completes without duplicate onboarding prompt", async () => {
    const printed: string[] = [];
    const runTurnCalls: Array<Record<string, unknown>> = [];

    await runReplSession({
      debug: false,
      ask: makeAsk(["小王", "都市", "/exit"]),
      print: (line) => printed.push(line),
      runTurn: async (args) => {
        runTurnCalls.push(args);
        return {
          narration_text: "你看向街口。",
          reference: "向东侧巷道走近一些。",
          state: args.state
        };
      }
    });

    expect(runTurnCalls).toHaveLength(0);
    expect(printed).toEqual([
      "Please define your role first.\n请先定义你的角色。",
      "Role profile recorded.\n已记录角色设定。",
      "Please define your world background first.\n请先定义你的世界背景。",
      "World background recorded. Setup complete, you can start taking actions.\n已记录世界背景。设定完成，你可以开始行动。"
    ]);
  });

  it("prints system_ack via kind and re-enters onboarding after /reset in debug mode", async () => {
    const printed: string[] = [];
    const runTurnCalls: Array<Record<string, unknown>> = [];

    await runReplSession({
      debug: true,
      ask: makeAsk(["小王", "都市", "/reset", "/exit"]),
      print: (line) => printed.push(line),
      runTurn: async (args) => {
        runTurnCalls.push(args);
        return {
          narration_text: "你看向街口。",
          reference: "向东侧巷道走近一些。",
          state: args.state
        };
      }
    });

    expect(runTurnCalls).toHaveLength(0);
    const parsed = printed.map((line) => JSON.parse(line) as Record<string, unknown>);
    const kinds = parsed.map((item) => item.kind);
    expect(kinds).toEqual([
      "onboarding_prompt",
      "onboarding_ack",
      "onboarding_prompt",
      "onboarding_ack",
      "system_ack",
      "onboarding_prompt"
    ]);
  });

  it("runs turn only after onboarding completion and prints turn_result in non-debug mode", async () => {
    const printed: string[] = [];
    const runTurnCalls: Array<Record<string, unknown>> = [];

    await runReplSession({
      debug: false,
      ask: makeAsk(["小王", "都市", "我在哪", "/exit"]),
      print: (line) => printed.push(line),
      runTurn: async (args) => {
        runTurnCalls.push(args);
        return {
          narration_text: "你站在城市中心。",
          reference: "你可以先观察附近的街区。",
          state: {
            ...args.state,
            approved_interaction_history: [
              {
                raw_input_text: args.rawInputText,
                narration_text: "你站在城市中心。"
              }
            ]
          }
        };
      }
    });

    expect(runTurnCalls).toHaveLength(1);
    expect(runTurnCalls[0]?.rawInputText).toBe("我在哪");
    expect((runTurnCalls[0]?.state as Record<string, unknown>).onboarding).toEqual({
      completed: true,
      step: "world_background",
      role_profile: "小王",
      world_background: "都市"
    });
    expect(printed.at(-1)).toBe("你站在城市中心。\n你可以先观察附近的街区。");
  });
});
