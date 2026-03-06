import "dotenv/config";
import { createLiveTurnExecutor } from "../../../src/runtime/create-live-turn-executor";
import { readApiConfig } from "./config";
import { createSessionStepHandler } from "./create-session-step-handler";
import { createApiFetch } from "./router";

const config = readApiConfig();
const runtime = createLiveTurnExecutor();
const sessionStepHandler = createSessionStepHandler({
  runTurn: runtime.executeTurn,
  allowedOrigins: [config.allowedOrigin]
});
const fetch = createApiFetch({
  sessionStepHandler
});

Bun.serve({
  port: config.port,
  fetch
});

console.log(`[api] listening on http://localhost:${config.port}`);
