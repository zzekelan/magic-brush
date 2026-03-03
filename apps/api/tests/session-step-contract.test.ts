import { describe, expect, it, vi } from "vitest";
import { createSessionStepHandler } from "../src/create-session-step-handler";

describe("session step response contract", () => {
  it("returns next_state and kind for command flow", async () => {
    const runTurn = vi.fn();
    const handler = createSessionStepHandler({
      runTurn,
      allowedOrigins: ["http://localhost:5173"]
    });

    const req = new Request("http://localhost:8787/api/session/step", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        raw_input_text: "/reset",
        state_snapshot: { hp: 10, onboarding: { completed: true, step: "world_background" } }
      })
    });

    const res = await handler(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual(
      expect.objectContaining({
        kind: "system_ack",
        next_state: {},
        message_key: "system_ack_session_reset",
        message: {
          en: "Session state reset.",
          zh: "会话已重置。"
        }
      })
    );
    expect(runTurn).not.toHaveBeenCalled();
  });
});
