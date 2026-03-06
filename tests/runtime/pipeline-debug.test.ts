import { describe, expect, it } from "vitest";
import { runTurnPipeline } from "../../src/runtime/pipeline";

describe("runTurn debug channel", () => {
  it("omits debug payload when debug=false", async () => {
    const out = await runTurnPipeline({
      rawInputText: "look around",
      debug: false,
      judge: async () => ({
        verdict: "reject",
        reason_code: "MISSING_PREREQ",
        internal_reason: "missing key",
        confidence: 0.95,
        ref_from_judge: "Find the key."
      }),
      narrate: async () => ({
        narration_text: "The gate remains shut.",
        reference: "Search nearby."
      }),
      state: { completed_turn_count: 0 },
      judgeTemperature: 0,
      narrateTemperature: 1
    });

    expect(out.debug).toBeUndefined();
    expect(out.state.completed_turn_count).toBe(1);
    expect(out.state).not.toHaveProperty("current_turn_index");
  });

  it("includes debug.llm payload with retry-accumulated usage when debug=true", async () => {
    const out = await runTurnPipeline({
      rawInputText: "open gate",
      debug: true,
      judge: async () => ({
        data: {
          verdict: "approve",
          reason_code: "APPROVED",
          internal_reason: "ok",
          confidence: 0.95,
          ref_from_judge: "Proceed."
        },
        usage_total_tokens: 100
      }),
      narrate: async () => ({
        data: {},
        usage_total_tokens: 70
      }),
      state: { hp: 10, completed_turn_count: 1, approved_interaction_history: [] },
      judgeTemperature: 0,
      narrateTemperature: 1
    });

    expect(out.system_error_code).toBe("NARRATE_SCHEMA_INVALID");
    expect(out.system_error_detail).toBeUndefined();
    expect(out.debug).toEqual(
      expect.objectContaining({
        llm: {
          judge: { temperature: 0, attempts: 1, usage_total_tokens: 100 },
          narrate: { temperature: 1, attempts: 4, usage_total_tokens: 280 },
          usage_total_tokens: 380
        },
        error: expect.objectContaining({
          system_error_code: "NARRATE_SCHEMA_INVALID",
          system_error_detail: expect.stringContaining("narration_text")
        })
      })
    );
    expect(out.debug).toEqual(
      expect.objectContaining({
        judge_context_snapshot: expect.objectContaining({
          raw_input_text: "open gate",
          completed_turn_count: 1,
          current_turn_index: 2
        }),
        narrate_context_snapshot: expect.objectContaining({
          raw_input_text: "open gate",
          completed_turn_count: 1,
          current_turn_index: 2
        })
      })
    );
    expect(out.state.completed_turn_count).toBe(1);
    expect(out.state).not.toHaveProperty("current_turn_index");
  });
});
