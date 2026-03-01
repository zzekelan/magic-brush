# Conversation Context On Reject Design

## Goal

Keep dialogue continuity even when turns are rejected, without changing game-world state.

## Decision Summary

- Keep `approved_interaction_history` semantics unchanged: approved + narrate-success turns only.
- Add `conversation_context` as runtime-owned dialogue memory for both approved and rejected successful turns.
- Set `conversation_context` retention to latest **2** entries.
- Update CLI docs and usage text to standardize on `bun run turn --debug "..."`.

## Problem

When early turns are repeatedly rejected, the runtime keeps no new memory in state. This leaves the model with weak recent context and hurts perceived continuity.

At the same time, approval semantics must remain meaningful:
- `approve`: world state may progress.
- `reject`: world state must not progress.

## Scope

In scope:
- Runtime state memory semantics.
- Commit behavior in turn pipeline.
- Prompt/context consumption of state snapshot.
- Tests and docs aligned to new behavior.

Out of scope:
- New gameplay reason codes.
- New agent architecture.
- Long-term memory beyond current in-process state.

## Data Model

Add runtime-managed key:

```ts
conversation_context: Array<{
  raw_input_text: string;
  narration_text: string;
  verdict: "approve" | "reject";
  reason_code: string;
}>
```

Retention policy:
- Always truncate to latest 2 entries (`slice(-2)`).

## Runtime Behavior

### Success Path

After `judge` and `narrate` both succeed:
- Append one entry to `conversation_context` for both `approve` and `reject`.
- If `verdict === "approve"`, also append to `approved_interaction_history` (existing behavior).
- If `verdict === "reject"`, do not apply any world-state mutation.

### Failure Path

If turn ends with system fallback (`JUDGE_*` or `NARRATE_*`):
- Do not write `conversation_context`.
- Do not write `approved_interaction_history`.

Rationale: avoid polluting memory with system fallback text and keep memory quality high.

## Context Contract Impact

No new top-level context contract fields are required. `state_snapshot` already flows into Judge and Narrate; it will now include `conversation_context` when present.

Prompt guidance should clarify:
- `conversation_context` is for dialogue continuity.
- Rejected entries are not world facts.

## Why Approval Still Matters

Approval semantics remain strict and meaningful:
- `approve` controls world progression and approved history.
- `reject` contributes dialogue continuity only.

This separates:
- **Fact/state layer** (`approved_interaction_history` + world keys),
- **Conversation layer** (`conversation_context`).

## CLI Standardization

Standardize examples and usage text to:

```bash
bun run turn --debug "look around"
```

Note: runtime cannot reliably distinguish whether user typed the optional separator form, so this is a documentation and UX standardization, not a hard runtime prohibition.

## Test Plan

1. `tests/runtime/commit.test.ts`
- Add tests for `conversation_context` append, shape validation fallback, and `limit=2` truncation.

2. `tests/runtime/pipeline.test.ts`
- `reject + narrate success`: `conversation_context` updates; `approved_interaction_history` unchanged.
- `approve + narrate success`: both histories update correctly.

3. `tests/runtime/system-error-channel.test.ts`
- Fallback cases do not mutate `conversation_context`.

4. `tests/runtime/run-live-turn.test.ts` (if needed)
- Validate that `state_snapshot` visibility includes `conversation_context`.

5. CLI tests/docs
- Update usage assertions and docs to `bun run turn --debug ...`.

## Risks And Mitigations

- Risk: 2-entry memory may be too short in longer reject streaks.
  - Mitigation: keep limit configurable later if needed; start with strict value requested now.

- Risk: model may treat rejected memory as facts.
  - Mitigation: explicit prompt instruction and preserved approved-history separation.

## Acceptance Criteria

- Repeated rejected turns still produce coherent follow-up behavior using recent context.
- Rejected turns never mutate game-world state.
- Approved turns continue current world progression semantics.
- `conversation_context` always keeps only last 2 successful turn records.
- Docs and usage examples consistently show `bun run turn --debug`.
