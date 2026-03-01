const HISTORY_LIMIT = 50;

type ApprovedInteraction = {
  raw_input_text: string;
  narration_text: string;
};

function isApprovedInteraction(value: unknown): value is ApprovedInteraction {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.raw_input_text === "string" &&
    typeof candidate.narration_text === "string"
  );
}

function readApprovedInteractionHistory(state: Record<string, unknown>): ApprovedInteraction[] {
  const raw = state.approved_interaction_history;
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.filter(isApprovedInteraction);
}

export function commitApprovedInteraction(input: {
  state: Record<string, unknown>;
  rawInputText: string;
  narrationText: string;
}): Record<string, unknown> {
  const approvedInteractionHistory = [
    ...readApprovedInteractionHistory(input.state),
    {
      raw_input_text: input.rawInputText,
      narration_text: input.narrationText
    }
  ].slice(-HISTORY_LIMIT);

  return {
    ...input.state,
    approved_interaction_history: approvedInteractionHistory
  };
}
