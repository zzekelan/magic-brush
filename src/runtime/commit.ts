const HISTORY_LIMIT = 50;

function readHistory(state: Record<string, unknown>): string[] {
  const raw = state.narration_history;
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.filter((item): item is string => typeof item === "string");
}

export function commitApprovedState(input: {
  state: Record<string, unknown>;
  statePatch: Record<string, unknown>;
  narrationText: string;
}): Record<string, unknown> {
  const narrationHistory = [...readHistory(input.state), input.narrationText].slice(
    -HISTORY_LIMIT
  );

  return {
    ...input.state,
    ...input.statePatch,
    narration_history: narrationHistory
  };
}
