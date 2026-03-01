import { describe, expect, it } from "vitest";
import { parseTurnArgs } from "../../src/cli/parse-cli-args";

describe("parseTurnArgs", () => {
  it("throws when no player input is provided", () => {
    expect(() => parseTurnArgs([])).toThrow(/player input/i);
  });

  it("returns first arg as player input with debug=false", () => {
    expect(parseTurnArgs(["look around"])).toEqual({
      rawInputText: "look around",
      debug: false
    });
  });

  it("accepts --debug flag and returns debug=true", () => {
    expect(parseTurnArgs(["--debug", "look around"])).toEqual({
      rawInputText: "look around",
      debug: true
    });
  });
});
