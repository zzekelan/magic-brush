import { describe, expect, it } from "vitest";
import { parseTurnInput } from "../../src/cli/run-turn";

describe("parseTurnInput", () => {
  it("throws when no player input is provided", () => {
    expect(() => parseTurnInput([])).toThrow(/player input/i);
  });

  it("returns first arg as player input", () => {
    expect(parseTurnInput(["look around"])).toBe("look around");
  });
});
