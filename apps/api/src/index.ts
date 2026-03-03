import "dotenv/config";
import { createLiveTurnExecutor } from "../../../src/runtime/create-live-turn-executor";
import { readApiConfig } from "./config";
import { createTurnHandler } from "./create-turn-handler";

const config = readApiConfig();
const runTurn = createLiveTurnExecutor();
const handler = createTurnHandler({
  runTurn,
  allowedOrigins: [config.allowedOrigin]
});

Bun.serve({
  port: config.port,
  fetch: (req) => handler(req)
});

console.log(`[api] listening on http://localhost:${config.port}`);
