import { describe, expect, it } from "vitest";
import {
  commitApprovedInteraction,
  commitConversationContext
} from "../../src/runtime/commit";

describe("commitApprovedInteraction", () => {
  it("appends an approved interaction and preserves existing state", () => {
    const out = commitApprovedInteraction({
      state: {
        hp: 10,
        approved_interaction_history: [{ raw_input_text: "look", narration_text: "You scan." }]
      },
      rawInputText: "open gate",
      narrationText: "You push the heavy gate open."
    });
    expect(out.hp).toBe(10);
    expect(out.approved_interaction_history).toEqual([
      { raw_input_text: "look", narration_text: "You scan." },
      { raw_input_text: "open gate", narration_text: "You push the heavy gate open." }
    ]);
  });

  it("limits approved_interaction_history to 50 entries", () => {
    const history = Array.from({ length: 55 }, (_, i) => ({
      raw_input_text: `in${i + 1}`,
      narration_text: `n${i + 1}`
    }));
    const out = commitApprovedInteraction({
      state: { approved_interaction_history: history },
      rawInputText: "latest-input",
      narrationText: "latest-narration"
    });
    expect((out.approved_interaction_history as Array<Record<string, unknown>>).length).toBe(50);
    expect(
      (out.approved_interaction_history as Array<Record<string, unknown>>)[0]
    ).toEqual({
      raw_input_text: "in7",
      narration_text: "n7"
    });
    expect((out.approved_interaction_history as Array<Record<string, unknown>>).at(-1)).toEqual({
      raw_input_text: "latest-input",
      narration_text: "latest-narration"
    });
  });
});

describe("commitConversationContext", () => {
  it("appends a reject turn and preserves existing world state", () => {
    const out = commitConversationContext({
      state: {
        hp: 10
      },
      rawInputText: "open gate",
      narrationText: "The gate remains shut.",
      verdict: "reject",
      reasonCode: "MISSING_PREREQ"
    });

    expect(out.hp).toBe(10);
    expect(out.conversation_context).toEqual([
      {
        raw_input_text: "open gate",
        narration_text: "The gate remains shut.",
        verdict: "reject",
        reason_code: "MISSING_PREREQ"
      }
    ]);
  });

  it("keeps only latest 2 conversation_context entries", () => {
    const out = commitConversationContext({
      state: {
        conversation_context: [
          {
            raw_input_text: "look",
            narration_text: "You scan the room.",
            verdict: "approve",
            reason_code: "RULE_CONFLICT"
          },
          {
            raw_input_text: "open gate",
            narration_text: "The gate does not move.",
            verdict: "reject",
            reason_code: "MISSING_PREREQ"
          }
        ]
      },
      rawInputText: "search fountain",
      narrationText: "You notice a glint below the moss.",
      verdict: "approve",
      reasonCode: "RULE_CONFLICT"
    });

    expect(out.conversation_context).toEqual([
      {
        raw_input_text: "open gate",
        narration_text: "The gate does not move.",
        verdict: "reject",
        reason_code: "MISSING_PREREQ"
      },
      {
        raw_input_text: "search fountain",
        narration_text: "You notice a glint below the moss.",
        verdict: "approve",
        reason_code: "RULE_CONFLICT"
      }
    ]);
  });

  it("filters malformed legacy entries before appending", () => {
    const out = commitConversationContext({
      state: {
        conversation_context: [
          { raw_input_text: "look", narration_text: "ok", verdict: "approve", reason_code: "RULE_CONFLICT" },
          { raw_input_text: "bad-only" },
          "oops"
        ]
      },
      rawInputText: "open gate",
      narrationText: "The lock clicks but holds.",
      verdict: "reject",
      reasonCode: "MISSING_PREREQ"
    });

    expect(out.conversation_context).toEqual([
      {
        raw_input_text: "look",
        narration_text: "ok",
        verdict: "approve",
        reason_code: "RULE_CONFLICT"
      },
      {
        raw_input_text: "open gate",
        narration_text: "The lock clicks but holds.",
        verdict: "reject",
        reason_code: "MISSING_PREREQ"
      }
    ]);
  });
});
