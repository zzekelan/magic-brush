import { describe, expect, it, vi } from "vitest";
import { createApiClient } from "./api-client";

describe("api client", () => {
  it("posts to /api/session/step and returns parsed JSON", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          kind: "turn_result",
          next_state: { hp: 1 },
          output: {
            narration_text: "n",
            reference: "r",
            state: { hp: 1 }
          }
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );

    const client = createApiClient({
      baseUrl: "http://localhost:8787",
      fetchImpl: fetchMock as typeof fetch
    });
    const out = await client.sessionStep({
      raw_input_text: "look",
      state_snapshot: { hp: 1 },
      debug: false
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8787/api/session/step",
      expect.objectContaining({ method: "POST" })
    );
    expect(out.kind).toBe("turn_result");
    if (out.kind === "turn_result") {
      expect(out.output.narration_text).toBe("n");
    }
  });
});
