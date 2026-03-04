import { describe, expect, it, vi } from "vitest";
import { createApiFetch } from "../src/router";

describe("api router", () => {
  it("returns 404 for removed /api/turn route", async () => {
    const sessionStepHandler = vi.fn().mockResolvedValue(new Response("ok"));
    const fetch = createApiFetch({ sessionStepHandler });

    const res = await fetch(new Request("http://localhost:8787/api/turn", { method: "POST" }));

    expect(res.status).toBe(404);
    expect(sessionStepHandler).not.toHaveBeenCalled();
  });

  it("routes /api/session/step to session handler", async () => {
    const sessionStepHandler = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ kind: "noop", next_state: {} }), { status: 200 }));
    const fetch = createApiFetch({ sessionStepHandler });

    const req = new Request("http://localhost:8787/api/session/step", { method: "POST" });
    const res = await fetch(req);

    expect(res.status).toBe(200);
    expect(sessionStepHandler).toHaveBeenCalledWith(req);
  });
});
