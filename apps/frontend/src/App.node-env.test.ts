// @vitest-environment node

import { describe, expect, it } from "vitest";

describe("frontend app module", () => {
  it("can be imported without window at module evaluation time", async () => {
    await expect(import("./App")).resolves.toHaveProperty("default");
  });
});
