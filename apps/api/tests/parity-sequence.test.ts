import { describe, expect, it, vi } from "vitest";
import { createSessionStepHandler } from "../src/create-session-step-handler";

describe("session step parity sequence", () => {
  it("preserves transition kinds across a fixed input sequence", async () => {
    const runTurn = vi.fn().mockImplementation(async (args) => ({
      narration_text: `执行:${args.rawInputText}`,
      reference: "继续行动。",
      state: {
        ...args.state,
        world_state: { location: "city_center" }
      }
    }));

    const handler = createSessionStepHandler({
      runTurn,
      allowedOrigins: ["http://localhost:5173"]
    });

    const inputs = ["小王", "都市", "我在哪", "/reset", "小李"];
    const kinds: string[] = [];
    let state: Record<string, unknown> = {};

    for (const input of inputs) {
      const req = new Request("http://localhost:8787/api/session/step", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          raw_input_text: input,
          state_snapshot: state,
          debug: true
        })
      });
      const res = await handler(req);
      const body = (await res.json()) as {
        kind: string;
        next_state: Record<string, unknown>;
      };
      kinds.push(body.kind);
      state = body.next_state;
    }

    expect(kinds).toEqual([
      "onboarding_ack",
      "onboarding_ack",
      "turn_result",
      "system_ack",
      "onboarding_ack"
    ]);
    expect(runTurn).toHaveBeenCalledTimes(1);
    expect(state).toEqual({
      onboarding: {
        completed: false,
        step: "world_background",
        role_profile: "小李"
      }
    });
  });
});
