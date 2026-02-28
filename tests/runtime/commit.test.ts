import { describe, expect, it } from "vitest";
import { processCommit } from "../../src/runtime/commit";

describe("processCommit", () => {
  it("commits event and state on approve", () => {
    const out = processCommit({ verdict: "approve", state_patch: { hp: 9 } }, { hp: 10 });
    expect(out.eventCommitted).toBe(true);
    expect(out.newState.hp).toBe(9);
  });

  it("commits event only on reject", () => {
    const out = processCommit({ verdict: "reject" }, { hp: 10 });
    expect(out.eventCommitted).toBe(true);
    expect(out.newState.hp).toBe(10);
  });
});
