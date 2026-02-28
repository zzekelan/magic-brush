# Magic Brush Runtime V1

## Pipeline Order

Each turn runs in this order:

`PlayerInput -> Judge -> Validate/Retry -> EventCommit -> (approve only) StateCommit -> BuildNarrateContext -> Narrate -> Respond`

Judge runs first. Narrate is the only user-facing output stage.

## Error Domains

- `reason_code`: business/gameplay outcomes (for example `MISSING_PREREQ`).
- `system_error_code`: system/runtime failures (for example `NARRATE_SCHEMA_INVALID`).

These two domains are separate and should not be mixed.

## Privacy Boundary

`internal_reason` is internal-only. It must never be sent into narrate context or user-visible output.

Use `toNarrateContext()` to sanitize Judge output before any narrate call.

## Run Tests

```bash
npm test
```
