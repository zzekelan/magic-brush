import { describe, expect, it, vi } from "vitest";
import { createTurnHandler } from "../src/create-turn-handler";

describe("createTurnHandler", () => {
  it("returns 400 for missing raw_input_text", async () => {
    const runTurn = vi.fn();
    const handler = createTurnHandler({
      runTurn,
      allowedOrigins: ["http://localhost:5173"]
    });

    const req = new Request("http://localhost:8787/api/turn", {
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

  it("maps request fields to runTurn arguments", async () => {
    const runTurn = vi.fn().mockResolvedValue({
      narration_text: "n",
      reference: "r",
      state: { k: 1 }
    });
    const handler = createTurnHandler({
      runTurn,
      allowedOrigins: ["http://localhost:5173"]
    });

    const req = new Request("http://localhost:8787/api/turn", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        raw_input_text: "open gate",
        state_snapshot: { hp: 10 },
        debug: true
      })
    });

    const res = await handler(req);
    expect(res.status).toBe(200);
    expect(runTurn).toHaveBeenCalledWith({
      rawInputText: "open gate",
      state: { hp: 10 },
      debug: true
    });
  });
});
