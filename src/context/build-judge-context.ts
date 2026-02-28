export type JudgeContext = {
  raw_input_text: string;
  state_snapshot: Record<string, unknown>;
};

export function buildJudgeContext(input: {
  rawInputText: string;
  state: Record<string, unknown>;
}): JudgeContext {
  return {
    raw_input_text: input.rawInputText,
    state_snapshot: input.state
  };
}
