import { ZodError } from "zod";
import { toReplRender } from "../../../src/interaction/repl-render";
import { stepInteraction } from "../../../src/interaction/step-engine";
import type { InteractionStepResult } from "../../../src/interaction/types";
import { SessionStepResponseSchema } from "./session-step-response-schema";
import { SessionStepRequestSchema } from "./session-step-schema";

function withCorsHeaders(headers: Headers, origin?: string) {
  if (origin) {
    headers.set("access-control-allow-origin", origin);
  }
  headers.set("access-control-allow-methods", "POST,OPTIONS");
  headers.set("access-control-allow-headers", "content-type");
  return headers;
}

function json(body: unknown, status: number, origin?: string): Response {
  const headers = withCorsHeaders(new Headers({ "content-type": "application/json" }), origin);
  return new Response(JSON.stringify(body), { status, headers });
}

function noContent(origin?: string): Response {
  const headers = withCorsHeaders(new Headers(), origin);
  return new Response(null, { status: 204, headers });
}

function toApiPayload(result: InteractionStepResult) {
  if (result.kind === "exit" || result.kind === "noop") {
    return SessionStepResponseSchema.parse({
      kind: result.kind,
      next_state: result.nextState
    });
  }

  const replRender = toReplRender(result);
  if (!replRender) {
    throw new Error("unreachable: non-render step without terminal kind");
  }

  if (replRender.kind === "turn_result") {
    return SessionStepResponseSchema.parse({
      kind: "turn_result",
      next_state: result.nextState,
      output: replRender.output
    });
  }

  return SessionStepResponseSchema.parse({
    kind: replRender.kind,
    next_state: result.nextState,
    text: replRender.text
  });
}

export function createSessionStepHandler(input: {
  runTurn: (args: {
    rawInputText: string;
    state: Record<string, unknown>;
    debug?: boolean;
  }) => Promise<unknown>;
  allowedOrigins: string[];
}) {
  const allowed = new Set(input.allowedOrigins);

  return async (request: Request): Promise<Response> => {
    const origin = request.headers.get("origin") ?? undefined;
    const corsOrigin = origin && allowed.has(origin) ? origin : undefined;

    if (request.method === "OPTIONS") {
      return noContent(corsOrigin);
    }

    if (request.method !== "POST") {
      return json({ error: "Method Not Allowed" }, 405, corsOrigin);
    }

    try {
      const payload = SessionStepRequestSchema.parse(await request.json());
      const result = await stepInteraction({
        rawInputText: payload.raw_input_text,
        state: payload.state_snapshot,
        debug: payload.debug,
        runTurn: input.runTurn
      });
      return json(toApiPayload(result), 200, corsOrigin);
    } catch (error) {
      if (error instanceof ZodError) {
        return json({ error: "Invalid request", detail: error.issues }, 400, corsOrigin);
      }
      return json({ error: "Internal Server Error" }, 500, corsOrigin);
    }
  };
}
