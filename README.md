# Magic Brush

[English](README.md) | [简体中文](README.zh-CN.md)

Magic Brush is an LLM-powered generative world interactive fiction runtime.

> Each action does more than produce a reply.  
> It keeps creating the world as you play.

Built around a structured `Judge -> Narrate` turn engine, Magic Brush is designed for immersive web play and developer-facing runtime integration.

## Core Features

- Generative-world play: each action can reshape a shared world across turns
- Two-stage turn engine: `Judge -> Narrate` with structured JSON output
- Stateful sessions with onboarding, `/reset`, and `/exit` in Web and REPL flows
- Recommended full experience: Web mode, plus CLI REPL and CLI single-turn runtime entry points
- OpenAI-compatible provider interface (Chat Completions compatible)

## Demo Video

<video controls preload="metadata" src="assets/demo-video.mp4">
  Your browser does not support embedded video. Download it from <a href="assets/demo-video.mp4">assets/demo-video.mp4</a>.
</video>

Direct link: [assets/demo-video.mp4](assets/demo-video.mp4)

## Recommended: Web Mode

This is the closest thing to the fully immersive text-generative-world experience.

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

## Other Entry Points

CLI single turn is useful for direct runtime calls without session onboarding:

```bash
cp .env.example .env
bun run turn "look around"
```

Optional:

```bash
bun run turn --debug "look around"
```

CLI REPL keeps a session open and includes onboarding, `/reset`, and `/exit`:

```bash
bun run turn:repl
```

## Test Commands

```bash
bun run test
bun run test:all
```

## For Developers

`DEVELOPMENT.md` for architecture, implementation and more details.
