# Magic Brush Runtime V1

## Pipeline Order

Each turn runs in this order:

`PlayerInput -> Judge -> Validate/Retry -> BuildNarrateContext -> Narrate -> (approve+narrate success only) StateCommit -> Respond`

Judge runs first. Narrate is the only user-facing output stage.

## Error Domains

- `reason_code`: business/gameplay outcomes only (for example `MISSING_PREREQ`).
- `system_error_code`: system/runtime failures (for example `JUDGE_LOW_CONFIDENCE`, `NARRATE_SCHEMA_INVALID`).

These two domains are separate and should not be mixed.

## Privacy Boundary

`internal_reason` is internal-only. It must never be sent into narrate context or user-visible output.

Use `buildNarrateContext()` to sanitize Judge output before any narrate call.

## Run One Live Turn

1. Create `.env` from `.env.example`.
2. Set:
   - `LLM_BASE_URL`
   - `LLM_API_KEY`
   - `LLM_MODEL`
3. Run:

```bash
bun run turn -- "look around"
```

Output is JSON containing `narration_text`, `reference`, `state`, and optional `system_error_code`.

## REPL Mode (In-Process Memory)

Run:

```bash
bun run turn:repl
```

Commands:

- `/reset` clears in-memory state.
- `/exit` exits the REPL.

The REPL keeps state in memory within the same process (`state = out.state` after each turn), so gameplay can continue across prompts in one session.

## Run Tests

```bash
bun run test
```
