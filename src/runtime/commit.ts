function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function processCommit(
  judge: { verdict: "approve" | "reject"; state_patch?: unknown },
  state: Record<string, unknown>
) {
  if (judge.verdict === "approve" && isRecord(judge.state_patch)) {
    return {
      eventCommitted: true,
      newState: {
        ...state,
        ...judge.state_patch
      }
    };
  }

  return {
    eventCommitted: true,
    newState: state
  };
}
