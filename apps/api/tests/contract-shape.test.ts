import { describe, expect, it, vi } from "vitest";
import { createTurnHandler } from "../src/create-turn-handler";

describe("turn response contract", () => {
  it("returns runtime turn fields for frontend", async () => {
    const runTurn = vi.fn().mockResolvedValue({
      narration_text: "n",
      reference: "r",
      state: { x: 1 },
      system_error_code: undefined
    });

    const handler = createTurnHandler({
      runTurn,
      allowedOrigins: ["http://localhost:5173"]
    });

    const req = new Request("http://localhost:8787/api/turn", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ raw_input_text: "look" })
    });

    const res = await handler(req);
    const body = await res.json();

    expect(body).toEqual(
      expect.objectContaining({
        narration_text: expect.any(String),
        reference: expect.any(String),
        state: expect.any(Object)
      })
    );
  });
});
