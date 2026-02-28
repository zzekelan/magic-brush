import { describe, expect, it } from "vitest";
import { runtimeVersion } from "../src/index";

describe("smoke", () => {
  it("exports runtime version", () => {
    expect(runtimeVersion).toBe("0.1.0");
  });
});
