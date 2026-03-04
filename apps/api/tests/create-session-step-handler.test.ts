import { describe, expect, it, vi } from "vitest";
import { createSessionStepHandler } from "../src/create-session-step-handler";

describe("createSessionStepHandler", () => {
  it("returns 400 for missing raw_input_text", async () => {
    const runTurn = vi.fn();
    const handler = createSessionStepHandler({
      runTurn,
      allowedOrigins: ["http://localhost:5173"]
    });

    const req = new Request("http://localhost:8787/api/session/step", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:5173"
      },
      body: JSON.stringify({ state_snapshot: {} })
    });

    const res = await handler(req);
    expect(res.status).toBe(400);
    expect(runTurn).not.toHaveBeenCalled();
  });

  it("returns onboarding_ack with text and without message fields", async () => {
    const runTurn = vi.fn();
    const handler = createSessionStepHandler({
      runTurn,
      allowedOrigins: ["http://localhost:5173"]
    });

    const req = new Request("http://localhost:8787/api/session/step", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:5173"
      },
      body: JSON.stringify({ raw_input_text: "我是游侠", state_snapshot: {} })
    });

    const res = await handler(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({
      kind: "onboarding_ack",
      text: "Role profile recorded.\n已记录角色设定。",
      next_state: {
        onboarding: {
          completed: false,
          step: "world_background",
          role_profile: "我是游侠"
        }
      }
    });
    expect(body).not.toHaveProperty("message_key");
    expect(body).not.toHaveProperty("message");
    expect(runTurn).not.toHaveBeenCalled();
  });

  it("returns noop and keeps state for whitespace input", async () => {
    const runTurn = vi.fn();
    const handler = createSessionStepHandler({
      runTurn,
      allowedOrigins: ["http://localhost:5173"]
    });

    const req = new Request("http://localhost:8787/api/session/step", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        raw_input_text: "   ",
        state_snapshot: {
          onboarding: {
            completed: false,
            step: "world_background",
            role_profile: "小王"
          }
        }
      })
    });

    const res = await handler(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({
      kind: "noop",
      next_state: {
        onboarding: {
          completed: false,
          step: "world_background",
          role_profile: "小王"
        }
      }
    });
    expect(runTurn).not.toHaveBeenCalled();
  });

  it("maps turn result to repl-aligned output payload", async () => {
    const runTurn = vi.fn().mockResolvedValue({
      narration_text: "你站在城市中心。",
      reference: "观察周围。",
      reason_code: undefined,
      system_error_code: undefined,
      debug: { judge_ms: 14 },
      state: { hp: 10 }
    });
    const handler = createSessionStepHandler({
      runTurn,
      allowedOrigins: ["http://localhost:5173"]
    });

    const req = new Request("http://localhost:8787/api/session/step", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        raw_input_text: "我在哪",
        debug: true,
        state_snapshot: {
          onboarding: {
            completed: true,
            step: "world_background",
            role_profile: "小王",
            world_background: "都市"
          }
        }
      })
    });

    const res = await handler(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(runTurn).toHaveBeenCalledWith({
      rawInputText: "我在哪",
      debug: true,
      state: {
        onboarding: {
          completed: true,
          step: "world_background",
          role_profile: "小王",
          world_background: "都市"
        }
      }
    });
    expect(body).toEqual({
      kind: "turn_result",
      next_state: { hp: 10 },
      output: {
        narration_text: "你站在城市中心。",
        reference: "观察周围。",
        state: { hp: 10 },
        debug: { judge_ms: 14 }
      }
    });
    expect(body).not.toHaveProperty("turn");
    expect(body).not.toHaveProperty("debug");
  });
});
