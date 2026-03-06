import { describe, expect, it, vi } from "vitest";
import { runTurnPipeline } from "../../src/runtime/pipeline";

describe("runTurn", () => {
  it("skips judge on the first turn and seeds narrate with approved chinese guidance", async () => {
    const judge = vi.fn().mockResolvedValue({
      verdict: "reject",
      reason_code: "MISSING_PREREQ",
      internal_reason: "should not run",
      confidence: 0.1,
      ref_from_judge: "Should not appear."
    });
    const narrate = vi.fn().mockResolvedValue({
      narration_text: "雾气在脚边轻轻散开。",
      reference: "继续说出你的下一步。"
    });

    const out = await runTurnPipeline({
      rawInputText: "你好",
      debug: true,
      judge,
      narrate,
      state: {}
    });

    expect(judge).not.toHaveBeenCalled();
    expect(narrate).toHaveBeenCalledWith({
      raw_input_text: "你好",
      verdict: "approve",
      reason_code: "APPROVED",
      ref_from_judge: "你的选择会推动眼前的一切，直接说出你接下来想做什么。",
      state_snapshot: {
        completed_turn_count: 0,
        current_turn_index: 1
      }
    });
    expect(out.debug?.llm.judge).toEqual({
      temperature: 0,
      attempts: 0,
      usage_total_tokens: 0
    });
    expect(out.debug?.judge_result_snapshot).toEqual({
      verdict: "approve",
      reason_code: "APPROVED",
      confidence: 1,
      ref_from_judge: "你的选择会推动眼前的一切，直接说出你接下来想做什么。"
    });
    expect(out.state.completed_turn_count).toBe(1);
  });

  it("records reject turn in conversation_context without mutating approved history", async () => {
    const out = await runTurnPipeline({
      rawInputText: "open gate",
      judge: async () => ({
        verdict: "reject",
        reason_code: "MISSING_PREREQ",
        internal_reason: "missing key",
        confidence: 0.95,
        ref_from_judge: "Find the key."
      }),
      narrate: async () => ({
        narration_text: "The gate remains shut.",
        reference: "Search the fountain area first."
      }),
      state: {
        hp: 10,
        completed_turn_count: 1,
        approved_interaction_history: [
          { raw_input_text: "look", narration_text: "Old approved narration." }
        ],
        conversation_context: [
          {
            raw_input_text: "inspect gate",
            narration_text: "The hinges are rusted.",
            verdict: "approve",
            reason_code: "APPROVED"
          }
        ]
      }
    });

    expect(out.state.hp).toBe(10);
    expect(out.state.approved_interaction_history).toEqual([
      { raw_input_text: "look", narration_text: "Old approved narration." }
    ]);
    expect(out.state.completed_turn_count).toBe(2);
    expect(out.state).not.toHaveProperty("current_turn_index");
    expect(out.state).not.toHaveProperty("interaction_turn_count");
    expect(out.state.conversation_context).toEqual([
      {
        raw_input_text: "inspect gate",
        narration_text: "The hinges are rusted.",
        verdict: "approve",
        reason_code: "APPROVED"
      },
      {
        raw_input_text: "open gate",
        narration_text: "The gate remains shut.",
        verdict: "reject",
        reason_code: "MISSING_PREREQ"
      }
    ]);
    expect(out.reference).toBe("Search the fountain area first.");
  });

  it("updates approved history and conversation_context on approve+narrate success", async () => {
    const out = await runTurnPipeline({
      rawInputText: "open gate",
      judge: async () => ({
        verdict: "approve",
        reason_code: "APPROVED",
        internal_reason: "ok",
        confidence: 0.95,
        ref_from_judge: "Proceed."
      }),
      narrate: async () => ({
        narration_text: "You push the heavy gate open.",
        reference: "Step into the courtyard."
      }),
      state: {
        hp: 10,
        completed_turn_count: 1,
        approved_interaction_history: [
          { raw_input_text: "look", narration_text: "n1" },
          { raw_input_text: "inspect gate", narration_text: "n2" }
        ],
        conversation_context: [
          {
            raw_input_text: "inspect gate",
            narration_text: "n2",
            verdict: "approve",
            reason_code: "APPROVED"
          }
        ]
      }
    });

    expect(out.state.hp).toBe(10);
    expect(
      (out.state.approved_interaction_history as Array<Record<string, unknown>>).at(-1)
    ).toEqual({
      raw_input_text: "open gate",
      narration_text: "You push the heavy gate open."
    });
    expect(out.state.completed_turn_count).toBe(2);
    expect(out.state).not.toHaveProperty("current_turn_index");
    expect(out.state).not.toHaveProperty("interaction_turn_count");
    expect(out.state.conversation_context).toEqual([
      {
        raw_input_text: "inspect gate",
        narration_text: "n2",
        verdict: "approve",
        reason_code: "APPROVED"
      },
      {
        raw_input_text: "open gate",
        narration_text: "You push the heavy gate open.",
        verdict: "approve",
        reason_code: "APPROVED"
      }
    ]);
    expect(out.reference).toBe("Step into the courtyard.");
  });
});
