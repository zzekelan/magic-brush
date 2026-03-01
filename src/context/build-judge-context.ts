export type JudgeContext = {
  raw_input_text: string;
  state_snapshot: Record<string, unknown>;
  narration_history: string[];
};

function readNarrationHistory(state: Record<string, unknown>): string[] {
  const rawHistory = state.narration_history;
  if (!Array.isArray(rawHistory)) {
    return [];
  }
  return rawHistory.filter((item): item is string => typeof item === "string");
}

export function buildJudgeContext(input: {
  rawInputText: string;
  state: Record<string, unknown>;
}): JudgeContext {
  return {
    raw_input_text: input.rawInputText,
    state_snapshot: input.state,
    narration_history: readNarrationHistory(input.state)
  };
}
