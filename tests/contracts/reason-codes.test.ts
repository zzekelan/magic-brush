import { describe, expect, it } from "vitest";
import { ReasonCodeSchema } from "../../src/contracts/reason-codes";

describe("ReasonCodeSchema", () => {
  it("accepts APPROVED for playable turns", () => {
    const parsed = ReasonCodeSchema.safeParse("APPROVED");
    expect(parsed.success).toBe(true);
  });

  it("rejects system error reason in business domain", () => {
    const parsed = ReasonCodeSchema.safeParse("SYSTEM_ERROR");
    expect(parsed.success).toBe(false);
  });
});
