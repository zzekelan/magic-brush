function readFiniteInteger(raw: unknown): number | undefined {
  if (typeof raw !== "number" || !Number.isFinite(raw)) {
    return undefined;
  }

  return Math.floor(raw);
}

export function readCompletedTurnCount(state: Record<string, unknown>): number {
  const completedTurnCount = readFiniteInteger(state.completed_turn_count);
  if (completedTurnCount !== undefined && completedTurnCount >= 0) {
    return completedTurnCount;
  }

  return 0;
}

export function normalizePersistedState(
  state: Record<string, unknown>
): Record<string, unknown> {
  const completedTurnCount = readCompletedTurnCount(state);
  const {
    completed_turn_count: rawCompletedTurnCount,
    current_turn_index: _ignoredCurrentTurnIndex,
    interaction_turn_count: _ignoredLegacyInteractionTurnCount,
    ...rest
  } = state;

  if (
    typeof rawCompletedTurnCount === "number" &&
    Number.isFinite(rawCompletedTurnCount) &&
    Math.floor(rawCompletedTurnCount) === completedTurnCount &&
    completedTurnCount >= 0 &&
    !("current_turn_index" in state) &&
    !("interaction_turn_count" in state)
  ) {
    return state;
  }

  return {
    ...rest,
    completed_turn_count: completedTurnCount
  };
}

export function buildRuntimeStateSnapshot(
  state: Record<string, unknown>
): Record<string, unknown> {
  const persistedState = normalizePersistedState(state);
  const currentTurnIndex = readCompletedTurnCount(persistedState) + 1;

  return {
    ...persistedState,
    current_turn_index: currentTurnIndex
  };
}
