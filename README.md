# Magic Brush

[English](README.md) | [简体中文](README.zh-CN.md)

Magic Brush is an LLM-powered immersive interactive fiction runtime.

> Where your words land, the world starts growing.

> Start with one action and shape your world.  
> The story keeps evolving based on your choices.

## Core Features

- Two-stage turn engine: `Judge -> Narrate` with structured JSON output
- Stateful sessions with `/reset` and `/exit`
- OpenAI-compatible provider interface (Chat Completions compatible)
- Multiple entry points: Web / CLI / REPL

## Recommended: Web Mode

1. Install dependencies

```bash
bun install
```

2. Configure API environment variables

```bash
cp .env.example apps/api/.env
```

At minimum:

- `LLM_BASE_URL`
- `LLM_API_KEY`
- `LLM_MODEL`
- `LLM_TIMEOUT_MS` (optional, default `30000`)
- `LLM_JUDGE_TEMPERATURE` (optional, default `0`, range `[0, 2]`)
- `LLM_NARRATE_TEMPERATURE` (optional, default `1.0`, range `[0, 2]`)

3. (Optional) Configure frontend environment variables

```bash
cp apps/frontend/.env.example apps/frontend/.env
```

4. Start frontend and API

```bash
bun run dev:frontend
bun run dev:api
```

5. Open in browser

- Frontend: `http://localhost:5173`
- API: `http://localhost:8787`

## CLI Mode (Optional)

```bash
cp .env.example .env
bun run turn "look around"
```

Optional:

```bash
bun run turn --debug "look around"
bun run turn:repl
```

## Test Commands

```bash
bun run test
bun run test:all
```

## For Developers

`DEVELOPMENT.md` for architecture, implementation and more details.
