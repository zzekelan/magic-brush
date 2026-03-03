import { ZodError } from "zod";
import { TurnRequestSchema } from "./turn-schema";

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

export function createTurnHandler(input: {
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
      const payload = TurnRequestSchema.parse(await request.json());
      const result = await input.runTurn({
        rawInputText: payload.raw_input_text,
        state: payload.state_snapshot,
        debug: payload.debug
      });
      return json(result, 200, corsOrigin);
    } catch (error) {
      if (error instanceof ZodError) {
        return json({ error: "Invalid request", detail: error.issues }, 400, corsOrigin);
      }
      return json({ error: "Internal Server Error" }, 500, corsOrigin);
    }
  };
}
