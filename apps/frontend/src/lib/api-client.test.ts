import { describe, expect, it, vi } from "vitest";
import { createApiClient } from "./api-client";

describe("api client", () => {
  it("posts to /api/turn and returns parsed JSON", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          narration_text: "n",
          reference: "r",
          state: { hp: 1 }
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );

    const client = createApiClient({
      baseUrl: "http://localhost:8787",
      fetchImpl: fetchMock as typeof fetch
    });
    const out = await client.turn({
      raw_input_text: "look",
      state_snapshot: { hp: 1 },
      debug: false
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8787/api/turn",
      expect.objectContaining({ method: "POST" })
    );
    expect(out.narration_text).toBe("n");
  });
});
