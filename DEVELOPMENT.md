# Magic Brush Development Guide

This document is for developer and secondary development.

If you are an end user, start from `README.md`.

Magic Brush is a turn-based text-game runtime with one shared interaction contract across:

- CLI single-turn (`bun run turn`)
- CLI REPL (`bun run turn:repl`)
- API server (`apps/api`)
- React frontend (`apps/frontend`)

Tech stack in current code:

- Runtime/API: Bun + TypeScript + Zod
- Frontend: React 19 + Vite 6 + Tailwind CSS 4
- LLM provider: OpenAI-compatible Chat Completions with strict JSON schema output

## Repository Layout

```text
.
├── src/                     # runtime core (agents, contracts, interaction, pipeline)
├── tests/                   # runtime tests
├── apps/
│   ├── api/                 # Bun HTTP adapter for session-step contract
│   └── frontend/            # React UI client
├── package.json             # monorepo scripts + workspace config
└── README.md
```

## Runtime Architecture (Current Behavior)

### 1) Turn Pipeline (`src/runtime/pipeline.ts`)

Each runtime turn executes in this order:

`Judge -> Validate/Retry -> BuildNarrateContext -> Narrate -> Commit -> Respond`

Details:

- `judge` receives `{ raw_input_text, state_snapshot }`
- `narrate` receives `{ raw_input_text, verdict, reason_code, ref_from_judge, state_snapshot }`
- `internal_reason` from judge is never forwarded to narrate (privacy boundary)
- LLM config includes stage-specific temperatures:
  - `judgeTemperature` default `0`
  - `narrateTemperature` default `1.0`
  - both validated in range `[0, 2]`
- Provider usage metadata is normalized into `usage_total_tokens` (fallback `0` when missing)
- Judge retry rules:
  - retry when schema parse fails
  - retry when `confidence < 0.6`
  - max 3 retries after first attempt (up to 4 attempts total)
- Narrate retry rules:
  - retry on every failure
  - max 3 retries after first attempt (up to 4 attempts total)
- Debug token accounting is retry-accumulated per stage within a turn

State commit rules:

- `approved_interaction_history` (max 100):
  - append only when `verdict=approve` and narrate succeeds
- `conversation_context` (max 6):
  - append on every successful narrate (approve or reject)
- `interaction_turn_count`:
  - initialized to `1` after onboarding completion
  - incremented by `+1` only after successful narrate commit
- If runtime returns system fallback, state is unchanged

Early-turn guidance behavior:

- Judge prompt uses `state_snapshot.interaction_turn_count` and when `<= 2` it should prefer approve unless clear safety risk.
- If judge verdict is reject, `ref_from_judge` must include one concrete immediately executable next action.
- Narrate prompt uses `state_snapshot.interaction_turn_count`; when `<= 2` and input is low-information, both `narration_text` and `reference` must provide actionable direction.
- In this early-turn low-information case, `reference` should provide 2-4 concise executable options.

System fallback output:

- `narration_text`: `"System busy, please try again."`
- `reference`: `"Try again with a different action in a moment."`
- `system_error_code`: one of:
  - `JUDGE_SCHEMA_INVALID`
  - `JUDGE_LOW_CONFIDENCE`
  - `JUDGE_CALL_FAILED`
  - `NARRATE_SCHEMA_INVALID`
  - `NARRATE_CALL_FAILED`

### 2) Interaction Step Engine (`src/interaction/step-engine.ts`)

Used by REPL and API. This layer handles commands + onboarding before calling runtime turn.

Order:

1. blank input -> `noop`
2. `/exit` -> `exit`
3. `/reset` -> `system_ack` + state reset to `{}`
4. onboarding gate:
   - step 1: collect `role_profile`
   - step 2: collect `world_background`
   - then mark onboarding complete and initialize `interaction_turn_count=1`
5. once onboarding complete -> execute runtime turn

Response kinds:

- `noop | exit` -> `{ kind, next_state }`
- `system_ack | onboarding_ack` -> `{ kind, text, next_state }`
- `turn_result` -> `{ kind, output, next_state }`

### 3) API Adapter (`apps/api`)

- Only gameplay route: `POST /api/session/step`
- Removed route: `POST /api/turn` (returns 404)
- Request/response validated by shared Zod contract (`src/interaction/session-step-contract.ts`)
- CORS allowlist controlled by `FRONTEND_ORIGIN` (default `http://localhost:5173`)

### 4) Frontend Adapter (`apps/frontend`)

- Uses `POST /api/session/step` for all interactions
- Always sends previous `next_state` as next request `state_snapshot`
- Mode policy:
  - Explore mode: always `debug=false`
  - Developer mode: always `debug=true`
- Debug JSON is rendered in side panel only, never merged into narration text

## Environment Setup

### Runtime CLI env (repo root)

For `bun run turn` and `bun run turn:repl`:

```bash
cp .env.example .env
```

Required keys:

- `LLM_BASE_URL`
- `LLM_API_KEY`
- `LLM_MODEL`
- `LLM_TIMEOUT_MS` (optional, default `30000`)
- `LLM_JUDGE_TEMPERATURE` (optional, default `0`, range `[0, 2]`)
- `LLM_NARRATE_TEMPERATURE` (optional, default `1.0`, range `[0, 2]`)

### API env (`apps/api/.env`)

`apps/api/src/index.ts` loads env from `apps/api` working directory.

Create `apps/api/.env` with runtime keys:

- `LLM_BASE_URL`
- `LLM_API_KEY`
- `LLM_MODEL`
- `LLM_TIMEOUT_MS` (optional)
- `LLM_JUDGE_TEMPERATURE` (optional, default `0`)
- `LLM_NARRATE_TEMPERATURE` (optional, default `1.0`)

Optional API keys:

- `API_PORT` (default `8787`)
- `FRONTEND_ORIGIN` (default `http://localhost:5173`)

### Frontend env (`apps/frontend/.env`)

```bash
cp apps/frontend/.env.example apps/frontend/.env
```

Key:

- `VITE_API_BASE_URL` (optional; default proxy target is `http://localhost:8787`)

Notes:

- For default local setup (`bun run dev:api` on `8787` + `bun run dev:frontend` on `5173`), this env is not required.
- Set it only when API base URL is not the default local target.

## Run Commands

Install dependencies:

```bash
bun install
```

Runtime single turn:

```bash
bun run turn "look around"
bun run turn --debug "look around"
```

Note: `bun run turn` calls runtime pipeline directly (no command handling, no onboarding gate).

Runtime REPL:

```bash
bun run turn:repl
bun run turn:repl --debug
```

REPL commands:

- `/reset` reset session state
- `/exit` exit REPL

Start API:

```bash
bun run dev:api
```

Start frontend:

```bash
bun run dev:frontend
```

## API Contract (`POST /api/session/step`)

Request:

```json
{
  "raw_input_text": "look around",
  "state_snapshot": {
    "interaction_turn_count": 2
  },
  "debug": false
}
```

Successful response examples:

- `noop` / `exit`

```json
{
  "kind": "noop",
  "next_state": {}
}
```

- `system_ack` / `onboarding_ack`

```json
{
  "kind": "system_ack",
  "text": "Session state reset.\n会话已重置。",
  "next_state": {}
}
```

- `turn_result`

```json
{
  "kind": "turn_result",
  "next_state": {
    "interaction_turn_count": 3
  },
  "output": {
    "narration_text": "You stand in the city center.",
    "reference": "Observe nearby streets.",
    "state": {
      "interaction_turn_count": 3
    }
  }
}
```

Validation notes:

- unknown request fields are rejected (`400`)
- contract is strict at both request and response level

## Debug Channel

When `debug=true`, runtime response adds `debug`:

- `llm`:
  - `judge`: `{ temperature, attempts, usage_total_tokens }`
  - `narrate`: `{ temperature, attempts, usage_total_tokens }`
  - `usage_total_tokens`: turn total (`judge + narrate`, retry-accumulated)
- `judge_context_snapshot`
- `judge_result_snapshot`
- `narrate_context_snapshot`
- `error` (stage/code/detail when available)

When `debug=false`, `debug` is omitted.

## Gameplay Reason Codes

Judge `reason_code` enum:

- `RULE_CONFLICT`
- `MISSING_PREREQ`
- `OUT_OF_SCOPE_ACTION`
- `SAFETY_BLOCKED`

`reason_code` is gameplay/business semantics and is separate from `system_error_code`.

## Tests

Runtime tests:

```bash
bun run test
```

Workspace-specific tests:

```bash
bun run test:api
bun run test:frontend
```

All tests:

```bash
bun run test:all
```

## Troubleshooting

If CLI commands hang, test a shorter timeout:

```bash
LLM_TIMEOUT_MS=8000 bun run turn "look around"
```

Then verify provider reachability:

```bash
set -a; source .env; set +a
curl -sS --max-time 10 "$LLM_BASE_URL/chat/completions" \
  -H "Authorization: Bearer $LLM_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"model\":\"$LLM_MODEL\",\"messages\":[{\"role\":\"user\",\"content\":\"hi\"}]}"
```
