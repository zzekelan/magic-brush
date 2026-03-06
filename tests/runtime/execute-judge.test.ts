import { describe, expect, it } from "vitest";
import { executeJudge } from "../../src/runtime/execute-judge";

describe("executeJudge", () => {
  it("returns ok=true with parsed judge payload", async () => {
    const out = await executeJudge({
      rawInputText: "蒸汽朋克废土",
      state: {},
      judgeAgent: {
        run: async () => ({
          verdict: "reject",
          reason_code: "MISSING_PREREQ",
          internal_reason: "x",
          confidence: 0.9,
          ref_from_judge: "补充主要势力。"
        })
      }
    });

    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.output.verdict).toBe("reject");
      expect(out.output.ref_from_judge).toBe("补充主要势力。");
    }
  });

  it("normalizes first-turn state before calling judge agent", async () => {
    let receivedContext: Record<string, unknown> | undefined;

    const out = await executeJudge({
      rawInputText: "蒸汽朋克废土",
      state: {},
      judgeAgent: {
        run: async (ctx) => {
          receivedContext = ctx as unknown as Record<string, unknown>;
          return {
            verdict: "approve",
            reason_code: "APPROVED",
            internal_reason: "ok",
            confidence: 0.95,
            ref_from_judge: "继续。"
          };
        }
      }
    });

    expect(out.ok).toBe(true);
    expect(receivedContext).toEqual({
      raw_input_text: "蒸汽朋克废土",
      state_snapshot: {
        completed_turn_count: 0,
        current_turn_index: 1
      }
    });
  });

  it("retries low confidence and succeeds when confidence recovers", async () => {
    let calls = 0;
    const out = await executeJudge({
      rawInputText: "蒸汽朋克废土",
      state: {},
      judgeAgent: {
        run: async () => {
          calls += 1;
          if (calls === 1) {
            return {
              verdict: "reject",
              reason_code: "MISSING_PREREQ",
              internal_reason: "low confidence",
              confidence: 0.1,
              ref_from_judge: "补充主要势力。"
            };
          }

          return {
            verdict: "reject",
            reason_code: "MISSING_PREREQ",
            internal_reason: "stable",
            confidence: 0.9,
            ref_from_judge: "补充主要势力。"
          };
        }
      }
    });

    expect(calls).toBe(2);
    expect(out.ok).toBe(true);
  });

  it("returns JUDGE_LOW_CONFIDENCE when retry budget is exhausted", async () => {
    let calls = 0;
    const out = await executeJudge({
      rawInputText: "蒸汽朋克废土",
      state: {},
      judgeAgent: {
        run: async () => {
          calls += 1;
          return {
            verdict: "reject",
            reason_code: "MISSING_PREREQ",
            internal_reason: "always low confidence",
            confidence: 0.1,
            ref_from_judge: "补充主要势力。"
          };
        }
      }
    });

    expect(calls).toBe(4);
    expect(out).toEqual({
      ok: false,
      system_error_code: "JUDGE_LOW_CONFIDENCE",
      usage_total_tokens: 0
    });
  });
});
