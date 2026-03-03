import "dotenv/config";
import { createLiveTurnExecutor } from "../../../src/runtime/create-live-turn-executor";
import { readApiConfig } from "./config";
import { createSessionStepHandler } from "./create-session-step-handler";
import { createTurnHandler } from "./create-turn-handler";

const config = readApiConfig();
const runTurn = createLiveTurnExecutor();
const turnHandler = createTurnHandler({
  runTurn,
  allowedOrigins: [config.allowedOrigin]
});
const sessionStepHandler = createSessionStepHandler({
  runTurn,
  allowedOrigins: [config.allowedOrigin]
});

Bun.serve({
  port: config.port,
  fetch: (req) => {
    const url = new URL(req.url);
    if (url.pathname === "/api/turn") {
      return turnHandler(req);
    }
    if (url.pathname === "/api/session/step") {
      return sessionStepHandler(req);
    }

    return new Response("Not Found", { status: 404 });
  }
});

console.log(`[api] listening on http://localhost:${config.port}`);
