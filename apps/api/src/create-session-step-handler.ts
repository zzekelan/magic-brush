import { ZodError } from "zod";
import { stepInteraction } from "../../../src/interaction/step-engine";
import type { InteractionStepResult } from "../../../src/interaction/types";
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

function toApiPayload(result: InteractionStepResult): Record<string, unknown> {
  if (result.kind === "exit") {
    return {
      kind: "exit",
      next_state: result.nextState
    };
  }

  if (result.kind === "turn_result") {
    return {
      kind: "turn_result",
      next_state: result.nextState,
      turn: {
        narration_text: result.output.narration_text,
        reference: result.output.reference,
        reason_code: result.output.reason_code,
        system_error_code: result.output.system_error_code,
        system_error_detail: result.output.system_error_detail
      },
      debug: result.output.debug
    };
  }

  return {
    kind: result.kind,
    next_state: result.nextState,
    message_key: result.messageKey,
    message: result.message
  };
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
      if (payload.raw_input_text === "") {
        return json(
          {
            kind: "noop",
            next_state: payload.state_snapshot
          },
          200,
          corsOrigin
        );
      }
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
