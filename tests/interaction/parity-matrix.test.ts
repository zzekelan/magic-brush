import { describe, expect, it, vi } from "vitest";
import { stepInteraction } from "../../src/interaction/step-engine";

describe("interaction parity matrix", () => {
  it("keeps command/onboarding/turn transition order stable", async () => {
    const runTurn = vi.fn().mockImplementation(async (args) => ({
      narration_text: `执行:${args.rawInputText}`,
      reference: "继续行动。",
      state: {
        ...args.state,
        world_state: { location: "city_center" }
      }
    }));

    const inputs = ["小王", "都市", "我在哪", "/reset", "小李"];
    const kinds: string[] = [];
    let state: Record<string, unknown> = {};

    for (const input of inputs) {
      const out = await stepInteraction({
        rawInputText: input,
        state,
        debug: true,
        runTurn
      });
      kinds.push(out.kind);
      state = out.nextState;
    }

    expect(kinds).toEqual([
      "onboarding_ack",
      "onboarding_ack",
      "turn_result",
      "system_ack",
      "onboarding_ack"
    ]);
    expect(runTurn).toHaveBeenCalledTimes(1);
    expect(runTurn).toHaveBeenCalledWith(
      expect.objectContaining({
        state: expect.objectContaining({
          interaction_turn_count: 1
        })
      })
    );
    expect(state).toEqual({
      onboarding: {
        completed: false,
        step: "world_background",
        role_profile: "小李"
      }
    });
  });
});
