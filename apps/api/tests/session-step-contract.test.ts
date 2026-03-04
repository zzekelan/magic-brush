import { describe, expect, it, vi } from "vitest";
import { createSessionStepHandler } from "../src/create-session-step-handler";

describe("session step response contract", () => {
  it("rejects unknown request fields", async () => {
    const runTurn = vi.fn();
    const handler = createSessionStepHandler({
      runTurn,
      allowedOrigins: ["http://localhost:5173"]
    });

    const req = new Request("http://localhost:8787/api/session/step", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        raw_input_text: "look",
        state_snapshot: {},
        unknown_field: 1
      })
    });

    const res = await handler(req);
    expect(res.status).toBe(400);
    expect(runTurn).not.toHaveBeenCalled();
  });

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
        text: "Session state reset.\n会话已重置。"
      })
    );
    expect(body).not.toHaveProperty("message_key");
    expect(body).not.toHaveProperty("message");
    expect(runTurn).not.toHaveBeenCalled();
  });
});
