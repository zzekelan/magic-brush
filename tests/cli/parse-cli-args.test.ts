import { describe, expect, it } from "vitest";
import { parseReplArgs, parseTurnArgs } from "../../src/cli/parse-cli-args";

describe("parseTurnArgs", () => {
  it("supports --debug after the input text", () => {
    expect(parseTurnArgs(["look around", "--debug"])).toEqual({
      rawInputText: "look around",
      debug: true
    });
  });

  it("shows usage with bun run turn --debug when input is missing", () => {
    expect(() => parseTurnArgs(["--debug"])).toThrow(
      /Usage: bun run turn --debug "look around"/i
    );
  });
});

describe("parseReplArgs", () => {
  it("returns debug=false by default", () => {
    expect(parseReplArgs([])).toEqual({ debug: false });
  });

  it("returns debug=true when --debug flag is present", () => {
    expect(parseReplArgs(["--debug"])).toEqual({ debug: true });
  });
});
