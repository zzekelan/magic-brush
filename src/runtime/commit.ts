const APPROVED_HISTORY_LIMIT = 100;
const CONVERSATION_CONTEXT_LIMIT = 6;

type ApprovedInteraction = {
  raw_input_text: string;
  narration_text: string;
};

type ConversationContextEntry = {
  raw_input_text: string;
  narration_text: string;
  verdict: "approve" | "reject";
  reason_code: string;
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

function isConversationContextEntry(value: unknown): value is ConversationContextEntry {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.raw_input_text === "string" &&
    typeof candidate.narration_text === "string" &&
    (candidate.verdict === "approve" || candidate.verdict === "reject") &&
    typeof candidate.reason_code === "string"
  );
}

function readApprovedInteractionHistory(state: Record<string, unknown>): ApprovedInteraction[] {
  const raw = state.approved_interaction_history;
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.filter(isApprovedInteraction);
}

function readConversationContext(state: Record<string, unknown>): ConversationContextEntry[] {
  const raw = state.conversation_context;
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.filter(isConversationContextEntry);
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
  ].slice(-APPROVED_HISTORY_LIMIT);

  return {
    ...input.state,
    approved_interaction_history: approvedInteractionHistory
  };
}

export function commitConversationContext(input: {
  state: Record<string, unknown>;
  rawInputText: string;
  narrationText: string;
  verdict: "approve" | "reject";
  reasonCode: string;
}): Record<string, unknown> {
  const conversationContext = [
    ...readConversationContext(input.state),
    {
      raw_input_text: input.rawInputText,
      narration_text: input.narrationText,
      verdict: input.verdict,
      reason_code: input.reasonCode
    }
  ].slice(-CONVERSATION_CONTEXT_LIMIT);

  return {
    ...input.state,
    conversation_context: conversationContext
  };
}
