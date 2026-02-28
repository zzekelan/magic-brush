export function processCommit(
  judge: { verdict: "approve" | "reject"; state_patch?: Record<string, unknown> },
  state: Record<string, unknown>
) {
  if (judge.verdict === "approve" && judge.state_patch) {
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
